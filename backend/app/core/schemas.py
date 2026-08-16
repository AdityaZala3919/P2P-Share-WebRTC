from typing import Generic, TypeVar, Optional
from fastapi import status as st
from pydantic import BaseModel, Field
from pydantic.alias_generators import to_camel

T = TypeVar("T")

class CamelCaseModel(BaseModel):
    """Base model with CamelCase serialization support."""
    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True

class BaseResponse(CamelCaseModel, Generic[T]):
    """Standardized envelope model for successful API responses."""
    status: str = Field(default="success", description="Status of the response")
    code: int = Field(default=st.HTTP_200_OK, description="HTTP status code")
    data: Optional[T] = Field(default=None, description="Response payload")

class BaseErrorResponse(CamelCaseModel):
    """Standardized envelope model for API error responses."""
    status: str = Field(default="error", description="Status of the response")
    code: int = Field(..., description="HTTP status code")
    message: str = Field(..., description="Error message")
