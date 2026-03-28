from __future__ import annotations

from dataclasses import dataclass

from sqlglot import exp, parse_one
from sqlglot.errors import ParseError

from app.models.schemas import ParseResponse, ValidationResponse, VisualizationResponse, VisualizationStep

SUPPORTED_DIALECTS = {"postgres", "sql"}


@dataclass
class StepFactory:
    key: str
    title: str
    description: str

    def build(self, focus: str) -> VisualizationStep:
        return VisualizationStep(
            key=self.key,
            title=self.title,
            description=self.description,
            focus=focus or "(implicit)",
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


def _collect_select_steps(select_statement: exp.Select, dialect: str) -> list[VisualizationStep]:
    steps: list[VisualizationStep] = []

    with_expr = select_statement.args.get("with")
    if isinstance(with_expr, exp.With) and with_expr.expressions:
        cte_focus = " | ".join(_sql(cte, dialect) for cte in with_expr.expressions)
        steps.append(STEP_DEFINITIONS["WITH"].build(cte_focus))

    from_expr = select_statement.args.get("from")
    if isinstance(from_expr, exp.From):
        source_focus = ", ".join(_sql(node, dialect) for node in from_expr.expressions)
        steps.append(STEP_DEFINITIONS["FROM"].build(source_focus))

    joins = select_statement.args.get("joins") or []
    if joins:
        join_focus = " | ".join(_sql(join, dialect) for join in joins)
        steps.append(STEP_DEFINITIONS["JOIN"].build(join_focus))

    where_expr = select_statement.args.get("where")
    if isinstance(where_expr, exp.Where):
        steps.append(STEP_DEFINITIONS["WHERE"].build(_sql(where_expr.this, dialect)))

    group_expr = select_statement.args.get("group")
    if isinstance(group_expr, exp.Group):
        group_focus = ", ".join(_sql(item, dialect) for item in group_expr.expressions)
        steps.append(STEP_DEFINITIONS["GROUP BY"].build(group_focus))

    having_expr = select_statement.args.get("having")
    if isinstance(having_expr, exp.Having):
        steps.append(STEP_DEFINITIONS["HAVING"].build(_sql(having_expr.this, dialect)))

    steps.append(STEP_DEFINITIONS["SELECT"].build(_projection_text(select_statement, dialect)))

    if select_statement.args.get("distinct"):
        steps.append(STEP_DEFINITIONS["DISTINCT"].build("DISTINCT"))

    window_nodes = list(select_statement.find_all(exp.Window))
    if window_nodes:
        focus_parts = [_sql(window, dialect) for window in window_nodes]
        steps.append(STEP_DEFINITIONS["WINDOW"].build(" | ".join(focus_parts)))

    order_expr = select_statement.args.get("order")
    if isinstance(order_expr, exp.Order):
        order_focus = ", ".join(_sql(item, dialect) for item in order_expr.expressions)
        steps.append(STEP_DEFINITIONS["ORDER BY"].build(order_focus))

    limit_expr = select_statement.args.get("limit")
    offset_expr = select_statement.args.get("offset")
    if isinstance(limit_expr, exp.Limit) or isinstance(offset_expr, exp.Offset):
        focus_parts: list[str] = []
        if isinstance(limit_expr, exp.Limit):
            focus_parts.append(f"LIMIT {_sql(limit_expr.expression, dialect)}")
        if isinstance(offset_expr, exp.Offset):
            focus_parts.append(f"OFFSET {_sql(offset_expr.expression, dialect)}")
        steps.append(STEP_DEFINITIONS["LIMIT/OFFSET"].build(" ".join(focus_parts)))

    return steps


def _collect_dml_steps(statement: exp.Expression, dialect: str) -> list[VisualizationStep]:
    if isinstance(statement, exp.Insert):
        target = STEP_DEFINITIONS["FROM"].build(_sql(statement.this, dialect))
        select_part = statement.args.get("expression")
        if isinstance(select_part, exp.Select):
            steps = [target, *_collect_select_steps(select_part, dialect)]
        else:
            steps = [
                target,
                STEP_DEFINITIONS["SELECT"].build(_projection_text(statement, dialect)),
            ]
    elif isinstance(statement, exp.Delete):
        steps = [STEP_DEFINITIONS["FROM"].build(_sql(statement.this, dialect))]
        where_expr = statement.args.get("where")
        if isinstance(where_expr, exp.Where):
            steps.append(STEP_DEFINITIONS["WHERE"].build(_sql(where_expr.this, dialect)))
    elif isinstance(statement, exp.Update):
        steps = [
            STEP_DEFINITIONS["FROM"].build(_sql(statement.this, dialect)),
            STEP_DEFINITIONS["SELECT"].build(", ".join(_sql(item, dialect) for item in statement.expressions)),
        ]
        where_expr = statement.args.get("where")
        if isinstance(where_expr, exp.Where):
            steps.append(STEP_DEFINITIONS["WHERE"].build(_sql(where_expr.this, dialect)))
    else:
        raise ValueError("Only SELECT/INSERT/UPDATE/DELETE statements are supported.")

    returning_expr = statement.args.get("returning")
    if isinstance(returning_expr, exp.Returning):
        returning_focus = ", ".join(_sql(item, dialect) for item in returning_expr.expressions)
        steps.append(STEP_DEFINITIONS["RETURNING"].build(returning_focus))

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

    return VisualizationResponse(
        dialect=dialect,
        statement_type=_statement_type(statement),
        normalized_query=statement.sql(dialect=_dialect_for_sqlglot(dialect), pretty=True),
        steps=steps,
        notes=notes,
    )
