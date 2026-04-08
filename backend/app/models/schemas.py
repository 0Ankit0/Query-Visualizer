from pydantic import BaseModel, Field

SUPPORTED_DIALECTS = ("postgres", "sql")


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="SQL query text to process")
    dialect: str = Field(default="sql", description="Supported values: postgres, sql")


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


class DialectsResponse(BaseModel):
    dialects: list[str]


class QueryExample(BaseModel):
    name: str
    dialect: str
    query: str


class ExamplesResponse(BaseModel):
    examples: list[QueryExample]
