from pydantic import BaseModel, Field

SUPPORTED_DIALECTS = ("postgres", "sql")


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="SQL query text to process")
    dialect: str = Field(default="postgres", description="Supported values: postgres, sql")


class ExplainPlanNode(BaseModel):
    node_type: str
    relation_name: str | None = None
    startup_cost: float | None = None
    total_cost: float | None = None
    actual_total_time: float | None = None
    actual_rows: int | None = None
    children: list["ExplainPlanNode"] = Field(default_factory=list)


class ExplainAnalysis(BaseModel):
    available: bool
    summary: str
    root_node: ExplainPlanNode | None = None
    plan_lines: list[str] = Field(default_factory=list)
    tips: list[str] = Field(default_factory=list)


class ValidationResponse(BaseModel):
    dialect: str
    is_valid: bool
    normalized_query: str | None = None
    errors: list[str] = Field(default_factory=list)


class ParseResponse(BaseModel):
    dialect: str
    normalized_query: str
    statement_type: str
    ast_sql: str


class VisualizationLane(BaseModel):
    label: str
    items: list[str] = Field(default_factory=list)
    tone: str = "default"


class VisualizationSource(BaseModel):
    name: str
    alias: str | None = None
    kind: str = "table"


class VisualizationJoin(BaseModel):
    join_type: str
    target: str
    alias: str | None = None
    condition: str | None = None


class VisualizationStep(BaseModel):
    key: str
    title: str
    description: str
    focus: str
    lanes: list[VisualizationLane] = Field(default_factory=list)


class VisualizationResponse(BaseModel):
    dialect: str
    statement_type: str
    normalized_query: str
    sources: list[VisualizationSource] = Field(default_factory=list)
    joins: list[VisualizationJoin] = Field(default_factory=list)
    output_columns: list[str] = Field(default_factory=list)
    filters: list[str] = Field(default_factory=list)
    groups: list[str] = Field(default_factory=list)
    order_by: list[str] = Field(default_factory=list)
    steps: list[VisualizationStep]
    notes: list[str]
    explain_analysis: ExplainAnalysis | None = None


class ExplainResponse(BaseModel):
    dialect: str
    normalized_query: str
    statement_type: str
    explain_analysis: ExplainAnalysis


class DialectsResponse(BaseModel):
    dialects: list[str]


class QueryExample(BaseModel):
    name: str
    dialect: str
    query: str


class ExamplesResponse(BaseModel):
    examples: list[QueryExample]
