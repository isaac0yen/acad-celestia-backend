from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
import requests
from sqlalchemy.orm import Session
from . import models, schemas
from .database import get_db

# Configuration
SECRET_KEY = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"  # Move to .env in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# NELF API configuration
NELF_API_BASE_URL = "https://slasapi.nelf.gov.ng/api"

# Security
security = HTTPBearer()

def create_access_token(data: dict):
    """
    Create a JWT access token for user authentication.

    Args:
        data (dict): The payload data to be encoded in the token.

    Returns:
        str: The encoded JWT token string.

    Note:
        The token expires after ACCESS_TOKEN_EXPIRE_MINUTES (default: 30 minutes).
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

class NELFClient:
    """
    Client for interacting with the NELF (Nigerian e-Learning Framework) API.
    
    This class provides methods to verify student information through the NELF API,
    including institution details and JAMB verification.
    """
    def __init__(self):
        self.base_url = NELF_API_BASE_URL

    def get_institutions(self) -> Dict[str, Any]:
        """
        Retrieve a list of registered institutions from the NELF API.

        Returns:
            Dict[str, Any]: A dictionary containing the list of institutions and their details.

        Raises:
            HTTPException: If the API request fails or returns a non-200 status code.
        """
        response = requests.get(f"{self.base_url}/services/institutions")
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to fetch institutions from NELF API"
            )
        return response.json()

    def verify_institute_details(self, matric_number: str, provider_id: str) -> Dict[str, Any]:
        """
        Verify student's institution details and obtain a verification token.

        Args:
            matric_number (str): Student's matriculation number.
            provider_id (str): Institution's provider ID.

        Returns:
            Dict[str, Any]: A verification token for subsequent JAMB verification.

        Raises:
            HTTPException: If verification fails or API request encounters an error.
        """
        data = {
            "matric_number": matric_number,
            "provider_id": provider_id
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/student/verify/institute-details",
                json=data
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to verify institute details"
                )

            result = response.json()
            if not result.get("status"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=result.get("message", "Institute verification failed")
                )

            return result["data"]["token"]

        except requests.RequestException as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to connect to NELF API: {str(e)}"
            )

    def verify_jamb_details(self, date_of_birth: str, jamb_number: str, token: str) -> Dict[str, Any]:
        """
        Verify student's JAMB details using the token obtained from institution verification.

        Args:
            date_of_birth (str): Student's date of birth.
            jamb_number (str): Student's JAMB registration number.
            token (str): Verification token from institute verification.

        Returns:
            Dict[str, Any]: Student's verified JAMB details including personal and academic information.

        Raises:
            HTTPException: If verification fails, token is invalid, or JAMB record is not found.
        """
        data = {
            "date_of_birth": date_of_birth,
            "jamb_number": jamb_number
        }
        headers = {"Authorization": f"Bearer {token}"}
        
        try:
            response = requests.post(
                f"{self.base_url}/student/register/jamb/verify",
                json=data,
                headers=headers
            )
            
            if response.status_code == 401:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid verification token"
                )
            elif response.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="JAMB record not found. Please check your JAMB number and date of birth"
                )
            elif response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"NELF API error: {response.text}"
                )

            result = response.json()
            if not result.get("status"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=result.get("message", "JAMB verification failed")
                )

            return result["data"]

        except requests.RequestException as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to connect to NELF API: {str(e)}"
            )

def verify_user(db: Session, institution_id: str, matric_number: str, jamb_number: str, date_of_birth: str) -> Optional[models.User]:
    """
    Complete the user verification process by validating both institution and JAMB details.

    This function performs a two-step verification process:
    1. Verifies institution details and obtains a verification token
    2. Uses the token to verify JAMB details
    After successful verification, creates and stores a new user record in the database.

    Args:
        db (Session): SQLAlchemy database session.
        institution_id (str): Institution's provider ID.
        matric_number (str): Student's matriculation number.
        jamb_number (str): Student's JAMB registration number.
        date_of_birth (str): Student's date of birth.

    Returns:
        Optional[models.User]: The created user object if verification is successful.

    Raises:
        HTTPException: If either institution or JAMB verification fails.
    """
    nelf_client = NELFClient()
    
    token = nelf_client.verify_institute_details(matric_number, institution_id)
    
    user_data = nelf_client.verify_jamb_details(date_of_birth, jamb_number, token)

    print("Sucessfully verified data")
    print(user_data)
    
    user = models.User(
        reg_number=user_data["RegNumber"] + " " + matric_number,
        nin=user_data["NIN"],
        surname=user_data["Surname"],
        first_name=user_data["FirstName"],
        middle_name=user_data.get("Middlename"),
        date_of_birth=user_data["DateofBirth"],
        gender=user_data["Gender"],
        state_of_origin=user_data["StateofOrigin"],
        lga_of_origin=user_data["LGAofOrigin"],
        admission_year=user_data["AdmissionYear"],
        institution=user_data["Institution"],
        institution_code=user_data["InstitutionCode"],
        course=user_data["Course"],
        course_code=user_data["CourseCode"],
        admission_type=user_data["AdmissionType"],
        profile_picture=user_data.get("ProfilePicture"),
        request_id=user_data["RequestID"]
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> models.User:
    """
    Verify and decode a JWT token to authenticate a user.

    Args:
        credentials (HTTPAuthorizationCredentials): The bearer token credentials from the request.
        db (Session): SQLAlchemy database session.

    Returns:
        models.User: The authenticated user object.

    Raises:
        HTTPException: If the token is invalid, expired, or the user is not found.
    """
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
