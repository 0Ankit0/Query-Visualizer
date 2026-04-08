from __future__ import annotations

from dataclasses import dataclass

from sqlglot import exp, parse_one
from sqlglot.errors import ParseError

from app.models.schemas import (
    ParseResponse,
    ValidationResponse,
    VisualizationJoin,
    VisualizationLane,
    VisualizationResponse,
    VisualizationSource,
    VisualizationStep,
)

SUPPORTED_DIALECTS = {"postgres", "sql"}


@dataclass
class StepFactory:
    key: str
    title: str
    description: str

    def build(self, focus: str, lanes: list[VisualizationLane] | None = None) -> VisualizationStep:
        return VisualizationStep(
            key=self.key,
            title=self.title,
            description=self.description,
            focus=focus or "(implicit)",
            lanes=lanes or [],
        )


STEP_DEFINITIONS = {
    "WITH": StepFactory(
        key="with",
        title="Build temporary result sets (CTEs)",
        description="Common table expressions run first and produce named intermediate datasets.",
    ),
    "FROM": StepFactory(
        key="from",
        title="Select source relations",
        description="Tables, views, or subqueries become the starting row set for evaluation.",
    ),
    "JOIN": StepFactory(
        key="join",
        title="Join related data",
        description="Join conditions merge rows from multiple sources into one working dataset.",
    ),
    "WHERE": StepFactory(
        key="where",
        title="Filter rows",
        description="Only rows that satisfy WHERE conditions continue to aggregation/projection.",
    ),
    "GROUP BY": StepFactory(
        key="group_by",
        title="Group rows",
        description="Rows are bucketed by grouping keys so aggregate functions can be computed.",
    ),
    "HAVING": StepFactory(
        key="having",
        title="Filter groups",
        description="HAVING keeps or discards groups after aggregate calculations are complete.",
    ),
    "SELECT": StepFactory(
        key="select",
        title="Project final columns",
        description="SELECT expressions define which columns and computed values appear in the output.",
    ),
    "DISTINCT": StepFactory(
        key="distinct",
        title="Remove duplicate output rows",
        description="DISTINCT de-duplicates projected rows before sorting and pagination.",
    ),
    "WINDOW": StepFactory(
        key="window",
        title="Apply window calculations",
        description="Window functions compute analytics across partitions while preserving row granularity.",
    ),
    "ORDER BY": StepFactory(
        key="order_by",
        title="Sort rows",
        description="ORDER BY defines final result ordering.",
    ),
    "LIMIT/OFFSET": StepFactory(
        key="limit_offset",
        title="Paginate result",
        description="LIMIT and OFFSET trim the sorted result set to the requested slice.",
    ),
    "RETURNING": StepFactory(
        key="returning",
        title="Return affected rows",
        description="PostgreSQL RETURNING emits values from inserted/updated/deleted rows.",
    ),
}


def _dialect_for_sqlglot(dialect: str) -> str:
    return "postgres" if dialect == "postgres" else "sqlite"


def _sql(node: exp.Expression, dialect: str) -> str:
    return node.sql(dialect=_dialect_for_sqlglot(dialect), pretty=False)


def _parse_statement(query: str, dialect: str) -> exp.Expression:
    return parse_one(query, read=_dialect_for_sqlglot(dialect))


def _projection_text(statement: exp.Expression, dialect: str) -> str:
    if isinstance(statement, exp.Select):
        return ", ".join(_sql(item, dialect) for item in statement.expressions) or "*"

    if isinstance(statement, exp.Subqueryable):
        select_node = statement.find(exp.Select)
        if select_node is not None:
            return ", ".join(_sql(item, dialect) for item in select_node.expressions) or "*"

    if isinstance(statement, exp.Insert):
        return _sql(statement.this, dialect)

    return _sql(statement, dialect)


def _lane(label: str, items: list[str], tone: str = "default") -> VisualizationLane:
    return VisualizationLane(label=label, items=items or ["(implicit)"], tone=tone)


def _select_projection_items(statement: exp.Select, dialect: str) -> list[str]:
    return [_sql(item, dialect) for item in statement.expressions] or ["*"]


def _from_sources(from_expr: exp.From | None, dialect: str) -> list[str]:
    if not isinstance(from_expr, exp.From):
        return []
    nodes: list[exp.Expression] = []
    if from_expr.this is not None:
        nodes.append(from_expr.this)
    nodes.extend(from_expr.expressions)
    return [_sql(node, dialect) for node in nodes]


def _source_kind(node: exp.Expression) -> str:
    if isinstance(node, exp.Subquery):
        return "subquery"
    if isinstance(node, exp.Table):
        return "table"
    return node.key.lower()


def _source_name(node: exp.Expression, dialect: str) -> str:
    if isinstance(node, exp.Table):
        return node.name
    return _sql(node, dialect)


def _source_alias(node: exp.Expression) -> str | None:
    alias_name = getattr(node, "alias_or_name", None)
    if isinstance(node, exp.Table):
        return node.alias or None
    if isinstance(alias_name, str) and alias_name:
        return alias_name
    return None


def _collect_sources(statement: exp.Expression, dialect: str) -> list[VisualizationSource]:
    sources: list[VisualizationSource] = []
    seen: set[tuple[str, str | None, str]] = set()

    from_expr = statement.args.get("from")
    nodes: list[exp.Expression] = []
    if isinstance(from_expr, exp.From):
        if from_expr.this is not None:
            nodes.append(from_expr.this)
        nodes.extend(from_expr.expressions)

    for node in nodes:
        item = VisualizationSource(name=_source_name(node, dialect), alias=_source_alias(node), kind=_source_kind(node))
        key = (item.name, item.alias, item.kind)
        if key not in seen:
            seen.add(key)
            sources.append(item)

    return sources


def _collect_joins(statement: exp.Expression, dialect: str) -> list[VisualizationJoin]:
    joins: list[VisualizationJoin] = []

    for join in statement.args.get("joins") or []:
        if not isinstance(join, exp.Join) or join.this is None:
            continue
        side = join.args.get("side")
        join_type = f"{side.upper()} JOIN" if isinstance(side, str) and side else "JOIN"
        joins.append(
            VisualizationJoin(
                join_type=join_type,
                target=_source_name(join.this, dialect),
                alias=_source_alias(join.this),
                condition=_sql(join.args["on"], dialect) if join.args.get("on") is not None else None,
            )
        )

    return joins


def _collect_filters(statement: exp.Expression, dialect: str) -> list[str]:
    filters: list[str] = []
    where_expr = statement.args.get("where")
    having_expr = statement.args.get("having")

    if isinstance(where_expr, exp.Where):
        filters.append(_sql(where_expr.this, dialect))
    if isinstance(having_expr, exp.Having):
        filters.append(_sql(having_expr.this, dialect))

    return filters


def _join_sources_and_conditions(joins: list[exp.Expression], dialect: str) -> tuple[list[str], list[str]]:
    sources: list[str] = []
    conditions: list[str] = []

    for join in joins:
        if not isinstance(join, exp.Join):
            continue
        if join.this is not None:
            sources.append(_sql(join.this, dialect))
        if join.args.get("on") is not None:
            conditions.append(_sql(join.args["on"], dialect))

    return sources, conditions


def _group_items(group_expr: exp.Group | None, dialect: str) -> list[str]:
    if not isinstance(group_expr, exp.Group):
        return []
    return [_sql(item, dialect) for item in group_expr.expressions]


def _order_items(order_expr: exp.Order | None, dialect: str) -> list[str]:
    if not isinstance(order_expr, exp.Order):
        return []
    return [_sql(item, dialect) for item in order_expr.expressions]


def _limit_offset_items(limit_expr: exp.Limit | None, offset_expr: exp.Offset | None, dialect: str) -> list[str]:
    items: list[str] = []
    if isinstance(limit_expr, exp.Limit) and limit_expr.expression is not None:
        items.append(f"LIMIT {_sql(limit_expr.expression, dialect)}")
    if isinstance(offset_expr, exp.Offset) and offset_expr.expression is not None:
        items.append(f"OFFSET {_sql(offset_expr.expression, dialect)}")
    return items


def _aggregate_items(statement: exp.Select, dialect: str) -> list[str]:
    aggregate_nodes = list(statement.find_all(exp.AggFunc))
    seen: list[str] = []

    for node in aggregate_nodes:
        sql = _sql(node, dialect)
        if sql not in seen:
            seen.append(sql)

    return seen


def _result_items(statement: exp.Select, dialect: str) -> list[str]:
    projections = _select_projection_items(statement, dialect)
    return projections[:4] if projections else ["result rows"]


def _collect_select_steps(select_statement: exp.Select, dialect: str) -> list[VisualizationStep]:
    steps: list[VisualizationStep] = []

    with_expr = select_statement.args.get("with")
    if isinstance(with_expr, exp.With) and with_expr.expressions:
        cte_focus = " | ".join(_sql(cte, dialect) for cte in with_expr.expressions)
        steps.append(
            STEP_DEFINITIONS["WITH"].build(
                cte_focus,
                lanes=[
                    _lane("Definitions", [_sql(cte, dialect) for cte in with_expr.expressions], "source"),
                    _lane("Result", [cte.alias_or_name or "cte_result" for cte in with_expr.expressions], "active"),
                ],
            )
        )

    from_expr = select_statement.args.get("from")
    if isinstance(from_expr, exp.From):
        source_items = _from_sources(from_expr, dialect)
        source_focus = ", ".join(source_items)
        steps.append(
            STEP_DEFINITIONS["FROM"].build(
                source_focus,
                lanes=[
                    _lane("Sources", source_items, "source"),
                    _lane("Result", ["base row set", "all source columns"], "active"),
                ],
            )
        )

    joins = select_statement.args.get("joins") or []
    if joins:
        join_focus = " | ".join(_sql(join, dialect) for join in joins)
        join_sources, join_conditions = _join_sources_and_conditions(joins, dialect)
        steps.append(
            STEP_DEFINITIONS["JOIN"].build(
                join_focus,
                lanes=[
                    _lane("Incoming", _from_sources(from_expr, dialect) or ["base rows"], "source"),
                    _lane("Join Inputs", join_sources or ["joined source"], "default"),
                    _lane("Conditions", join_conditions or ["join predicate"], "detail"),
                    _lane("Result", ["merged row set", "combined columns"], "active"),
                ],
            )
        )

    where_expr = select_statement.args.get("where")
    if isinstance(where_expr, exp.Where):
        steps.append(
            STEP_DEFINITIONS["WHERE"].build(
                _sql(where_expr.this, dialect),
                lanes=[
                    _lane("Incoming", ["candidate rows"], "source"),
                    _lane("Predicate", [_sql(where_expr.this, dialect)], "detail"),
                    _lane("Result", ["matching rows only"], "active"),
                ],
            )
        )

    group_expr = select_statement.args.get("group")
    if isinstance(group_expr, exp.Group):
        group_items = _group_items(group_expr, dialect)
        steps.append(
            STEP_DEFINITIONS["GROUP BY"].build(
                ", ".join(group_items),
                lanes=[
                    _lane("Rows", ["filtered rows"], "source"),
                    _lane("Group Keys", group_items, "detail"),
                    _lane("Aggregates", _aggregate_items(select_statement, dialect) or ["aggregate values"], "active"),
                ],
            )
        )

    having_expr = select_statement.args.get("having")
    if isinstance(having_expr, exp.Having):
        steps.append(
            STEP_DEFINITIONS["HAVING"].build(
                _sql(having_expr.this, dialect),
                lanes=[
                    _lane("Groups", _group_items(group_expr, dialect) or ["grouped results"], "source"),
                    _lane("Predicate", [_sql(having_expr.this, dialect)], "detail"),
                    _lane("Result", ["groups kept after aggregate check"], "active"),
                ],
            )
        )

    projection_items = _select_projection_items(select_statement, dialect)
    steps.append(
        STEP_DEFINITIONS["SELECT"].build(
            _projection_text(select_statement, dialect),
            lanes=[
                _lane("Available Data", ["current row shape"], "source"),
                _lane("Selected Columns", projection_items, "active"),
            ],
        )
    )

    if select_statement.args.get("distinct"):
        steps.append(
            STEP_DEFINITIONS["DISTINCT"].build(
                "DISTINCT",
                lanes=[
                    _lane("Projected Rows", _result_items(select_statement, dialect), "source"),
                    _lane("Result", ["duplicates removed"], "active"),
                ],
            )
        )

    window_nodes = list(select_statement.find_all(exp.Window))
    if window_nodes:
        focus_parts = [_sql(window, dialect) for window in window_nodes]
        steps.append(
            STEP_DEFINITIONS["WINDOW"].build(
                " | ".join(focus_parts),
                lanes=[
                    _lane("Rows", ["rows preserved"], "source"),
                    _lane("Window", focus_parts, "detail"),
                    _lane("Result", ["analytics appended per row"], "active"),
                ],
            )
        )

    order_expr = select_statement.args.get("order")
    if isinstance(order_expr, exp.Order):
        order_items = _order_items(order_expr, dialect)
        steps.append(
            STEP_DEFINITIONS["ORDER BY"].build(
                ", ".join(order_items),
                lanes=[
                    _lane("Incoming", _result_items(select_statement, dialect), "source"),
                    _lane("Sort Keys", order_items, "detail"),
                    _lane("Result", ["rows reordered"], "active"),
                ],
            )
        )

    limit_expr = select_statement.args.get("limit")
    offset_expr = select_statement.args.get("offset")
    if isinstance(limit_expr, exp.Limit) or isinstance(offset_expr, exp.Offset):
        slice_items = _limit_offset_items(limit_expr, offset_expr, dialect)
        steps.append(
            STEP_DEFINITIONS["LIMIT/OFFSET"].build(
                " ".join(slice_items),
                lanes=[
                    _lane("Ordered Rows", ["sorted result set"], "source"),
                    _lane("Slice", slice_items, "detail"),
                    _lane("Result", ["returned page"], "active"),
                ],
            )
        )

    return steps


def _collect_dml_steps(statement: exp.Expression, dialect: str) -> list[VisualizationStep]:
    if isinstance(statement, exp.Insert):
        target_name = _sql(statement.this, dialect)
        target = STEP_DEFINITIONS["FROM"].build(
            target_name,
            lanes=[
                _lane("Target Table", [target_name], "source"),
                _lane("Result", ["rows to insert"], "active"),
            ],
        )
        select_part = statement.args.get("expression")
        if isinstance(select_part, exp.Select):
            steps = [target, *_collect_select_steps(select_part, dialect)]
        else:
            steps = [
                target,
                STEP_DEFINITIONS["SELECT"].build(
                    _projection_text(statement, dialect),
                    lanes=[
                        _lane("Values", [_projection_text(statement, dialect)], "detail"),
                        _lane("Result", ["insert payload"], "active"),
                    ],
                ),
            ]
    elif isinstance(statement, exp.Delete):
        target_name = _sql(statement.this, dialect)
        steps = [
            STEP_DEFINITIONS["FROM"].build(
                target_name,
                lanes=[
                    _lane("Target Table", [target_name], "source"),
                    _lane("Result", ["rows eligible for deletion"], "active"),
                ],
            )
        ]
        where_expr = statement.args.get("where")
        if isinstance(where_expr, exp.Where):
            steps.append(
                STEP_DEFINITIONS["WHERE"].build(
                    _sql(where_expr.this, dialect),
                    lanes=[
                        _lane("Incoming", ["candidate rows"], "source"),
                        _lane("Predicate", [_sql(where_expr.this, dialect)], "detail"),
                        _lane("Result", ["rows to delete"], "active"),
                    ],
                )
            )
    elif isinstance(statement, exp.Update):
        target_name = _sql(statement.this, dialect)
        assignment_items = [_sql(item, dialect) for item in statement.expressions]
        steps = [
            STEP_DEFINITIONS["FROM"].build(
                target_name,
                lanes=[
                    _lane("Target Table", [target_name], "source"),
                    _lane("Result", ["rows eligible for update"], "active"),
                ],
            ),
            STEP_DEFINITIONS["SELECT"].build(
                ", ".join(assignment_items),
                lanes=[
                    _lane("Assignments", assignment_items, "detail"),
                    _lane("Result", ["updated column values"], "active"),
                ],
            ),
        ]
        where_expr = statement.args.get("where")
        if isinstance(where_expr, exp.Where):
            steps.append(
                STEP_DEFINITIONS["WHERE"].build(
                    _sql(where_expr.this, dialect),
                    lanes=[
                        _lane("Incoming", ["candidate rows"], "source"),
                        _lane("Predicate", [_sql(where_expr.this, dialect)], "detail"),
                        _lane("Result", ["rows that will change"], "active"),
                    ],
                )
            )
    else:
        raise ValueError("Only SELECT/INSERT/UPDATE/DELETE statements are supported.")

    returning_expr = statement.args.get("returning")
    if isinstance(returning_expr, exp.Returning):
        returning_focus = ", ".join(_sql(item, dialect) for item in returning_expr.expressions)
        steps.append(
            STEP_DEFINITIONS["RETURNING"].build(
                returning_focus,
                lanes=[
                    _lane("Affected Rows", ["modified rows"], "source"),
                    _lane("Columns Returned", [_sql(item, dialect) for item in returning_expr.expressions], "active"),
                ],
            )
        )

    return steps


def _statement_type(statement: exp.Expression) -> str:
    if isinstance(statement, exp.Select):
        return "SELECT"
    if isinstance(statement, exp.Insert):
        return "INSERT"
    if isinstance(statement, exp.Update):
        return "UPDATE"
    if isinstance(statement, exp.Delete):
        return "DELETE"
    return statement.key.upper()


def _select_context(statement: exp.Expression) -> exp.Select | None:
    if isinstance(statement, exp.Select):
        return statement

    if isinstance(statement, exp.Insert) and isinstance(statement.args.get("expression"), exp.Select):
        return statement.args["expression"]

    return None


def parse_query(query: str, dialect: str) -> ParseResponse:
    try:
        statement = _parse_statement(query, dialect)
    except ParseError as exc:
        raise ValueError(f"Could not parse SQL query: {exc}") from exc
    return ParseResponse(
        dialect=dialect,
        normalized_query=statement.sql(dialect=_dialect_for_sqlglot(dialect), pretty=True),
        statement_type=_statement_type(statement),
        ast_sql=statement.sql(dialect=_dialect_for_sqlglot(dialect), pretty=False),
    )


def validate_query(query: str, dialect: str) -> ValidationResponse:
    try:
        parsed = _parse_statement(query, dialect)
    except ParseError as exc:
        return ValidationResponse(dialect=dialect, is_valid=False, errors=[str(exc)])

    return ValidationResponse(
        dialect=dialect,
        is_valid=True,
        normalized_query=parsed.sql(dialect=_dialect_for_sqlglot(dialect), pretty=True),
    )


def visualize_query(query: str, dialect: str) -> VisualizationResponse:
    if dialect not in SUPPORTED_DIALECTS:
        raise ValueError("Only 'postgres' and 'sql' dialects are supported.")

    try:
        statement = _parse_statement(query, dialect)
    except ParseError as exc:
        raise ValueError(f"Could not parse SQL query: {exc}") from exc

    if isinstance(statement, exp.Select):
        steps = _collect_select_steps(statement, dialect)
    elif isinstance(statement, (exp.Insert, exp.Update, exp.Delete)):
        steps = _collect_dml_steps(statement, dialect)
    else:
        raise ValueError("Only SELECT/INSERT/UPDATE/DELETE statements are supported.")

    if not steps:
        raise ValueError("No visualizable steps were detected for this query.")

    notes = [
        "Visualization uses SQL execution flow (which differs from clause writing order).",
        "The parser is AST-based to improve correctness over simple keyword matching.",
    ]

    if dialect == "postgres":
        notes.append("PostgreSQL mode enables PostgreSQL syntax and RETURNING clause visualization.")

    select_context = _select_context(statement)
    groups = _group_items(select_context.args.get("group"), dialect) if isinstance(select_context, exp.Select) else []
    order_by = _order_items(select_context.args.get("order"), dialect) if isinstance(select_context, exp.Select) else []
    output_columns = _select_projection_items(select_context, dialect) if isinstance(select_context, exp.Select) else []

    if isinstance(statement, exp.Update):
        output_columns = [_sql(item, dialect) for item in statement.expressions]
    elif isinstance(statement, exp.Delete):
        output_columns = ["deleted rows"]
    elif isinstance(statement, exp.Insert) and not output_columns:
        output_columns = [_projection_text(statement, dialect)]

    return VisualizationResponse(
        dialect=dialect,
        statement_type=_statement_type(statement),
        normalized_query=statement.sql(dialect=_dialect_for_sqlglot(dialect), pretty=True),
        sources=_collect_sources(select_context or statement, dialect),
        joins=_collect_joins(select_context or statement, dialect),
        output_columns=output_columns,
        filters=_collect_filters(select_context or statement, dialect),
        groups=groups,
        order_by=order_by,
        steps=steps,
        notes=notes,
    )
