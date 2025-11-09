import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  try {
    const { contractor, project, rating, review_title } = await request.json()

    const { data, error } = await resend.emails.send({
      from: 'BuildConnect <onboarding@resend.dev>',
      to: contractor.email,
      subject: '⭐ You received a new rating on BuildConnect!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .content {
                background: #f9fafb;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .rating-box {
                background: white;
                padding: 25px;
                border-radius: 10px;
                margin: 20px 0;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .stars {
                font-size: 28px;
                color: #fbbf24;
                margin: 15px 0;
              }
              .project-details {
                background: #e0e7ff;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #667eea;
                margin: 20px 0;
              }
              .button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 14px 30px;
                text-decoration: none;
                border-radius: 8px;
                margin-top: 20px;
                font-weight: 600;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 2px solid #e5e7eb;
                color: #6b7280;
                font-size: 14px;
              }
              h1 {
                margin: 0;
                font-size: 28px;
              }
              h2 {
                color: #667eea;
                margin-top: 0;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>⭐ New Rating Received!</h1>
            </div>

            <div class="content">
              <p>Hi ${contractor.full_name || contractor.company_name},</p>

              <p>Great news! You've received a new rating from a builder on BuildConnect.</p>

              <div class="rating-box">
                <h2>Rating Details</h2>
                <div class="stars">${'⭐'.repeat(rating)}${'☆'.repeat(5 - rating)}</div>
                <p style="font-size: 18px; font-weight: 600; margin: 10px 0;">
                  ${rating}/5 Stars
                </p>
                ${review_title ? `<p style="font-style: italic; color: #6b7280;">"${review_title}"</p>` : ''}
              </div>

              <div class="project-details">
                <h3 style="margin-top: 0; color: #667eea;">📋 Project</h3>
                <p style="font-weight: 600; margin: 5px 0;">${project.title}</p>
              </div>

              <p style="margin-top: 25px;">
                This rating helps build your reputation on BuildConnect and makes you more visible to potential clients.
              </p>

              <center>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/contractor/${contractor.id || 'profile'}" class="button">
                  View Your Profile
                </a>
              </center>

              <div class="footer">
                <p><strong>BuildConnect</strong> - Connecting Builders with Quality Contractors</p>
                <p>This is an automated notification. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
