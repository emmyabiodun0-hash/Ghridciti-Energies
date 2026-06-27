import os
import secrets
import string

from flask import json
from dotenv  import load_dotenv
import requests



BREVO_URL= "https://api.brevo.com/v3/smtp/email"
 
def generate_random_otp(lenght: int):
    """Generate otp"""
    random_digits = [secrets.choice(string.digits) for _ in range(lenght)]
    return "".join(random_digits)



def send_registration_mail(
    to:str,
    username:str,
    otp:str,
    html_content:str
    ):
    payload = {  
            "sender":{  
                "name":"Ghridciti Energies",
                "email":"gemmy1866@gmail.com"
            },
            "to":[  
            {  
                "email":to,
                "name":username
            }
            ],
                "subject":f"Verifiy Account: Your OTP is {otp}",
                "htmlContent": html_content
            }
    response = requests.post(
            url=BREVO_URL,
            headers={
                'accept': "application/json",
                'content-type':"application/json",
                'api-key':os.getenv("BREVO_API_KEY")
            },
            data=json.dumps(payload)
        )
    print(response.json())
    return response





def send_order_mail(
    to: str,
    customer_name: str,
    html_content: str
):
    payload = {
        "sender": {
            "name": "Ghridciti Energies",
            "email": "gemmy1866@gmail.com"
        },
        "to": [
            {
                "email": to,
                "name": customer_name
            }
        ],
        "subject": "New Meter Request",
        "htmlContent": html_content
    }

    response = requests.post(
        url=BREVO_URL,
        headers={
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": os.getenv("BREVO_API_KEY")
        },
        data=json.dumps(payload)
    )

    print(response.json())
    return response





