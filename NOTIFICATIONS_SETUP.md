# Notification Setup Guide (Resend)

This project is now fully integrated with **Resend** for live email notifications.

## Required Environment Variables

To activate live delivery, add the following to your environment secrets:

1.  **`BUSINESS_OWNER_EMAIL`**: The main email address where you want to receive inquiries and booking alerts.
2.  **`EMAIL_FROM_ADDRESS`**: Your verified Resend sender address (e.g., `onboarding@resend.dev` for testing, or your own domain like `bookings@yourdomain.com`).
3.  **`EMAIL_PROVIDER_API_KEY`**: Your **Resend API Key** (starts with `re_`). Get it from the [Resend Dashboard](https://resend.com/api-keys).

## How it Works

The site automatically routes the following events to your inbox:

- **New Booking Inquiries**: Sent immediately when a customer selects a time slot.
- **Confirmed Payments**: Sent after a successful Stripe checkout session.
- **Website Inquiries**: Sent via the "Quick Inquiry" form on the landing page.

## Testing with Resend

1.  Create a free account at [resend.com](https://resend.com).
2.  Add your API key to the environment variables.
3.  Set `EMAIL_FROM_ADDRESS` to `onboarding@resend.dev` (this works for the email you signed up with).
4.  Send a test inquiry from the website.

## Production Launch

When you are ready for production:
1.  Verify your custom domain in the Resend dashboard.
2.  Update `EMAIL_FROM_ADDRESS` to use your domain (e.g., `hello@yourshop.com`).
3.  Ensure `BUSINESS_OWNER_EMAIL` is correct.

## Architecture

All notification logic is centralized in the backend (`server.ts`). Private API keys are never exposed to the client side. If the API key is missing, the system will gracefully fall back to logging the email content to the server console.
