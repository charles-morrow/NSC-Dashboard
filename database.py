from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Update this path if you're using a different database
engine = create_engine("sqlite:///nashville_sc_business.db", 
                       connect_args={"check_same_thread": False},
                       echo=False)
Session = sessionmaker(bind=engine)