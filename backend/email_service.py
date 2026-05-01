import os
import httpx
import logging
from datetime import datetime
from zoneinfo import ZoneInfo
from dotenv import load_dotenv
from typing import List, Optional, Dict
load_dotenv()  
# Setup basic logging to see errors in Docker logs
logger = logging.getLogger(__name__)

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

async def send_reset_password_email(target_email: str, username: str, token: str):
    url = "https://api.brevo.com/v3/smtp/email"
    
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    logo_url = "https://res.cloudinary.com/dggciuh9l/image/upload/v1776788278/profile_pics/rtvycbiuzzog1b0qqj3n.png"
    timestamp = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%d %b, %H:%M")
    
    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }
    
    payload = {
        "sender": {"email": SENDER_EMAIL, "name": "Challvex"},
        "to": [{"email": target_email, "name": username}],
        "subject": f"Reset your password — {timestamp}",
        "htmlContent": f"""
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
            <title>Reset Password</title>
        </head>
        <body style="background-color: #09090b; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-text-size-adjust: none;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b;">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; width: 100%;">
                            <tr>
                                <td align="center" style="padding-bottom: 32px;">
                                    <img src="{logo_url}" alt="Challvex" height="22" style="display: block; outline: none; border: none; opacity: 0.9;" />
                                </td>
                            </tr>
                            
                            <tr>
                                <td align="left" style="background-color: #0c0c0e; border: 1px solid #27272a; padding: 40px;">
                                    <h1 style="color: #f4f4f5; font-size: 17px; font-weight: 500; margin: 0 0 16px 0; letter-spacing: -0.01em;">Hello {username},</h1>
                                    
                                    <p style="color: #a1a1aa; font-size: 13px; line-height: 1.6; margin: 0 0 24px 0;">
                                        We received a request to reset your password for your Challvex account. Click the button below to proceed.
                                    </p>

                                    <table border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td align="left">
                                                <a href="{reset_link}" target="_blank" style="background-color: #f4f4f5; border-radius: 0px; color: #09090b; display: inline-block; font-size: 12px; font-weight: 700; line-height: 44px; text-align: center; text-decoration: none; width: 180px; -webkit-text-size-adjust: none; text-transform: uppercase; letter-spacing: 0.05em;">Reset Password</a>
                                            </td>
                                        </tr>
                                    </table>

                                    <p style="color: #52525b; font-size: 11px; line-height: 1.6; margin: 28px 0 0 0;">
                                        Note: This link is valid for 60 minutes. If you did not request this, you can safely ignore this email.
                                    </p>
                                </td>
                            </tr>

                            <tr>
                            <td align="center" style="padding-top:32px;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="center" style="padding-bottom:12px;">
                                            <img src="{logo_url}" alt="Challvex" height="13" style="display:block; opacity:0.7;" />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="color:#71717a; font-size:10px; line-height:1.7; letter-spacing:0.01em; padding:0 12px;">
                                            This email was sent to
                                            <span style="color:#d4d4d8;">{target_email}</span>
                                            because a password reset was requested for your Challvex account.
                                            <br /><br />
                                            If you did not request this, you can safely ignore this message.
                                            <br /><br />
                                            <span style="color:#52525b;">© 2026 Challvex. All rights reserved.</span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code == 201:
                logger.info(f"Reset email sent successfully to {target_email}")
                return True
            else:
                logger.error(f"Brevo API Error: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"Failed to connect to Brevo: {str(e)}")
            return False
        
async def send_verification_otp_email(target_email: str, username: str, otp: str):
    url = "https://api.brevo.com/v3/smtp/email"
    
    # logo link provided
    logo_url = "https://res.cloudinary.com/dggciuh9l/image/upload/v1776788278/profile_pics/rtvycbiuzzog1b0qqj3n.png"
    
    # Generate unique timestamp for the subject
    timestamp = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%d %b, %H:%M")
    
    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }
    
    payload = {
        "sender": {"email": SENDER_EMAIL, "name": "Challvex"},
        "to": [{"email": target_email, "name": username}],
        "subject": f"{otp} is your verification code — {timestamp}",
        "htmlContent": f"""
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <title>Verify your email</title>
            </head>
            <body style="background-color: #09090b; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-text-size-adjust: none;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b;">
                    <tr>
                        <td align="center" style="padding: 40px 20px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; width: 100%;">
                                
                               <tr>
                                    <td align="center" style="padding-bottom: 32px;">
                                        <img src="{logo_url}" 
                                            alt="Challvex" 
                                            height="22" 
                                            style="display: block; outline: none; border: none; filter: brightness(0.1); -webkit-filter: brightness(0.1);" />
                                    </td>
                                </tr>
                                
                                <tr>
                                    <td align="left" style="background-color: #0c0c0e; border: 1px solid #27272a; padding: 40px;">
                                        <h1 style="color: #f4f4f5; font-size: 17px; font-weight: 500; margin: 0 0 16px 0; letter-spacing: -0.01em;">Hello {username},</h1>
                                        
                                        <p style="color: #a1a1aa; font-size: 13px; line-height: 1.6; margin: 0 0 24px 0;">
                                            Please use the following code to verify your email address. This code is valid for 10 minutes.
                                        </p>

                                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #111113; border: 1px solid #27272a;">
                                            <tr>
                                                <td align="center" style="padding: 20px; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: 8px;">
                                                    {otp}
                                                </td>
                                            </tr>
                                        </table>

                                        <p style="color: #52525b; font-size: 11px; line-height: 1.6; margin: 28px 0 0 0;">
                                            If you did not create an account or request this code, you can safely ignore this email.
                                        </p>
                                    </td>
                                </tr>

                                <tr>
                                    <td align="center" style="padding-top: 32px;">
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td align="center" style="padding-bottom: 12px;">
                                                    <img src="{logo_url}" alt="Challvex" height="13" style="display: block; opacity: 0.3; filter: grayscale(100%);" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td align="center" style="color: #71717a; font-size: 10px; line-height: 1.7; letter-spacing: 0.01em; padding: 0 12px;">
                                                    This email was sent to
                                                    <span style="color: #d4d4d8;">{target_email}</span>
                                                    because a verification was requested for your Challvex account.
                                                    <br /><br />
                                                    If you did not request this, you can safely ignore this message.
                                                    <br /><br />
                                                    Hyderabad, Telangana, India
                                                    <br />
                                                    <span style="color: #52525b;">© 2026 Challvex. All rights reserved.</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        """
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            return response.status_code == 201
        except Exception as e:
            logger.error(f"OTP Email Error: {str(e)}")
            return False
        
async def send_org_invite_email(
    target_email: str, 
    username: str, 
    inviter_name: str, 
    org_name: str,
    personal_note: Optional[str] = None, 
    is_priority: bool = False 
):
    url = "https://api.brevo.com/v3/smtp/email"
    invite_link = f"{FRONTEND_URL}/admin?tab=organization"
    logo_url = "https://res.cloudinary.com/dggciuh9l/image/upload/v1776788278/profile_pics/rtvycbiuzzog1b0qqj3n.png"
    
    # Unique timestamp to keep threads clean
    now = datetime.now(ZoneInfo("Asia/Kolkata"))
    timestamp = now.strftime("%d %b, %Y — %I:%M %p")
    
    # Human-friendly Subject
    if is_priority:
        subject = f"Message from {inviter_name} regarding {org_name} ({timestamp})"
    else:
        subject = f"You are invited to join {org_name} ({timestamp})"

    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }

    # Personal Note: Styled as a clean, human quote
    note_html = f"""
    <div style="margin-bottom: 32px; padding: 20px; border: 1px dashed #27272a; border-radius: 4px;">
        <p style="margin: 0; color: #f4f4f5; font-size: 14px; font-style: italic; line-height: 1.6;">
            "{personal_note}"
        </p>
        <p style="margin: 12px 0 0 0; font-size: 11px; color: #71717a; font-weight: 600;">
            — {inviter_name}
        </p>
    </div>
    """ if personal_note else ""
    
    payload = {
        "sender": {"email": SENDER_EMAIL, "name": "Challvex"},
        "to": [{"email": target_email, "name": username}],
        "subject": subject,
        "htmlContent": f"""
        <!DOCTYPE html>
        <html>
        <body style="background-color: #09090b; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 60px 20px;">
                <tr>
                    <td align="center">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #09090b;">
                            
                            <!-- Header -->
                            <tr>
                                <td style="padding-bottom: 48px;" align="center">
                                    <img src="{logo_url}" alt="Challvex" height="22" />
                                </td>
                            </tr>
                            
                            <!-- Body -->
                            <tr>
                                <td style="padding-bottom: 32px;">
                                    <h1 style="color: #ffffff; font-size: 24px; font-weight: 500; letter-spacing: -0.03em; margin: 0 0 16px 0;">
                                        You're invited.
                                    </h1>
                                    <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin: 0;">
                                        {inviter_name} wants you to join <span style="color: #ffffff;">{org_name}</span>. 
                                        This is a collaborative space where you can build and publish coding challenges together.
                                    </p>
                                </td>
                            </tr>

                            {note_html}

                            <!-- Action -->
                            <tr>
                                <td style="padding-bottom: 48px;">
                                    <a href="{invite_link}" style="background-color: #ffffff; color: #000000; display: inline-block; font-size: 14px; font-weight: 700; padding: 14px 32px; text-decoration: none; border-radius: 2px;">
                                        Review invitation
                                    </a>
                                </td>
                            </tr>

                            <!-- Pro Tip / Rule Explanation -->
                            <tr>
                                <td style="padding: 24px; background-color: #0c0c0e; border: 1px solid #18181b;">
                                    <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #f4f4f5; text-transform: uppercase; letter-spacing: 0.05em;">
                                        A quick note on spots
                                    </p>
                                    <p style="margin: 0; color: #71717a; font-size: 12px; line-height: 1.6;">
                                        To keep things focused, you can be a member of one organization at a time. If you’re already helping another team, you’ll need to leave that one before joining {org_name}.
                                    </p>
                                </td>
                            </tr>

                            <!-- Standard Footer -->
                            <tr>
                                <td align="center" style="padding-top: 60px;">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td align="center" style="padding-bottom: 16px;">
                                                <img src="{logo_url}" alt="Challvex" height="12" style="display: block; opacity: 0.2; filter: grayscale(100%);" />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td align="center" style="color: #3f3f46; font-size: 10px; line-height: 1.8; letter-spacing: 0.02em;">
                                                This invitation was sent to <span style="color: #71717a;">{target_email}</span>.
                                                <br />
                                                Sent via Challvex Identity Service • {timestamp}
                                                <br /><br />
                                                Hyderabad, Telangana, India
                                                <br />
                                                <span style="color: #27272a;">© 2026 Challvex. All rights reserved.</span>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            return response.status_code == 201
        except Exception as e:
            logger.error(f"Invite email failed: {str(e)}")
            return False