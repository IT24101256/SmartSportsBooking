# MySpot Knowledge Base

## 1. Product Overview

MySpot is a sports facility booking platform with a React web application, a Flutter mobile application, and an ASP.NET Core API backed by PostgreSQL.

Customers can:

- Register, verify email with an OTP, and sign in.
- Browse facilities, prices, images, FAQs, court type, ratings, and current status.
- Check date-specific hourly availability.
- Create, view, cancel, and reschedule bookings.
- Pay by card or bank transfer and upload a bank-transfer slip.
- Request facility equipment and view separate equipment charges.
- View a booking ticket and QR entry pass.
- Submit reviews and create support requests with threaded messages.

The platform has Customer, Staff, Manager, and Admin roles. Authorized staff can manage facilities, equipment, bookings, members, support, revenue, reviews, refunds, and rescheduling.

## 2. Current Facilities

The current seeded facility catalogue is:

| Facility | Sport | Court type | Rate |
|---|---|---|---:|
| Badminton Court | Badminton | Indoor | LKR 1,200/hour |
| Cricket Ground | Cricket | Outdoor | LKR 6,500/hour |
| Football Field | Football | Outdoor | LKR 4,500/hour |
| Indoor Basketball Arena | Basketball | Indoor | LKR 3,000/hour |
| Swimming Pool | Swimming | Outdoor | LKR 2,000/hour |
| Table Tennis Court | Table Tennis | Indoor | LKR 1,000/hour |
| Volleyball Court | Volleyball | Outdoor | LKR 2,800/hour |

All seeded facilities start as available, but availability can change because of bookings, maintenance, configured schedules, or staff action. Facility prices can also be changed by authorized staff.

Tennis and Fitness appear in equipment, schedule, or interface content, but there is no seeded Tennis or Fitness facility. Netball is not present in the current seeded facility catalogue. Do not promise a facility for these sports without checking live facility data.

## 3. Facility Details and Equipment

Facility records can include a description, FAQs, images, indoor/outdoor type, equipment, configured schedules, current occupancy, availability, and ratings.

Equipment is rented and charged separately by the hour. Current seeded equipment includes:

- Badminton: racket pairs LKR 300, feather shuttlecock tubes LKR 400, training nets LKR 200, grip wrap/powder sets LKR 150.
- Cricket: Kashmir willow bats LKR 500, leather match balls LKR 400, practice stumps and bails LKR 250, batting pads and gloves LKR 350, helmets LKR 200.
- Football: match balls LKR 300, training bibs LKR 200, agility ladder and cones LKR 250, goalkeeper gloves LKR 250.
- Basketball: official leather basketballs LKR 300, shot-clock remote and whistle LKR 400, court markers/cones LKR 150.
- Swimming: kickboard and pull-buoy sets LKR 200, swim fins LKR 250, water polo balls LKR 250.
- Tennis: racket pairs LKR 350, tennis balls LKR 250, ball collector hoppers LKR 200.
- Table Tennis: paddle pairs LKR 200, balls LKR 150, regulation net/post sets LKR 150.
- Volleyball: match volleyballs LKR 250, antennae and boundary guidelines LKR 200, ball carts LKR 150.

The listed equipment rates are hourly rates. Names, stock, availability, and prices are configurable; the live equipment catalogue is authoritative.

## 4. Booking Rules

- Authentication is required to create or manage a booking.
- Facility, date, start time, duration, customer name, NIC number, and 10-digit contact number are required.
- Bookings cannot be made for a previous date or for a time that has already passed today.
- Start times must be on a whole hour from 08:00 through 23:00.
- A booking must last at least one whole hour and finish by midnight.
- Active bookings for the same facility and time cannot overlap.
- The facility charge equals its hourly rate multiplied by the booked hours.
- Availability must be checked for the requested facility and date. Operating or configured schedule information does not guarantee that a slot is free.
- A booking is confirmed only when the API returns a confirmed status.

The availability endpoint exposes hourly slots from 08:00 through midnight and marks them Available, Booked, or Past. Exact facility schedules may be configured separately, so do not promise general opening hours without checking live data.

## 5. Payment Methods and Status

Regular customer bookings support:

- **Card:** Valid card number, expiry date, and three-digit CVV are required. After validation, the booking is recorded as paid and confirmed. Only the last four card digits are retained for display.
- **Bank transfer:** A bank-slip upload is required. The booking starts with pending payment and pending booking status until an authorized Manager or Admin verifies it. Approval changes the payment status to approved.

Cash is accepted only for privileged administrative or manager-created bookings, not as a normal customer option. Equipment payments are tracked separately from the main facility booking payment.

The assistant must not claim that a bank transfer was approved or a booking was confirmed until the system or an authorized staff member returns that status.

## 6. Cancellation and Refunds

Refunds are calculated from the time remaining before the booking starts, using Sri Lanka Standard Time (UTC+05:30):

| Time before start | Refund |
|---|---:|
| At least 24 hours | 100% of the facility booking amount |
| 12 to less than 24 hours | 50% of the facility booking amount |
| Less than 12 hours | 0% |

Additional rules:

- Expired bookings cannot be cancelled.
- A cancellation receives a status such as `To Refund` or `Non-refundable`.
- A Manager or Admin must confirm a payable refund; the system then records it as refunded.
- The cancellation quote returns the current percentage, amount, status, and policy explanation.
- Equipment payments are separate and must be handled according to their own administrative record.

## 7. Weather and Rescheduling

Managers or Admins can request rescheduling for heavy rain, adverse weather, maintenance, or another operational reason. Outdoor facilities are flagged as eligible for the rain-check workflow based on their facility name.

For a valid reschedule request:

- The booking status becomes `RescheduleRequested`.
- The reason is shown to the customer.
- The customer selects another available whole-hour slot.
- Cancelled or expired bookings cannot be rescheduled.
- A successful reschedule keeps the booking duration and returns it to confirmed status.

Do not promise a free reschedule for every situation. Confirm that the system created the request and accepted the new slot.

## 8. Registration and Account Security

Registration requires a full name, email, 10-digit contact number, NIC number, and password.

- A NIC must be 12 digits or 9 digits followed by V or X.
- A password must be at least 8 characters and contain uppercase, lowercase, a number, and a special character.
- Email verification and password reset use one-time passwords.
- Development mode may expose an OTP in the API response or console when SMTP is not configured. This is local-development behavior only.
- Never request or expose a password, JWT, card security code, or full card number.

## 9. Support and Reviews

Customers can create support requests with a title, details, and priority. Requests have a status and can contain threaded support messages. Support is appropriate for payment or bank-slip verification, booking changes, refund status, equipment, facility problems, account/OTP, and technical issues.

Customers can submit a rating and written review for a booking or facility. Ratings shown in the application must come from stored reviews; do not invent ratings.

## 10. AI Booking Assistant Rules

The assistant may:

1. Identify the requested sport or facility.
2. Provide current facility and equipment information returned by the system.
3. Ask for missing date, whole-hour start time, duration, and customer details.
4. Check live availability through the authorized booking API.
5. Explain payment, cancellation, refund, support, and rescheduling status.
6. Report the actual booking, payment, cancellation, or rescheduling result.

The backend also supports an agentic booking workflow with planning, validation, manager approval, revision, approval, rejection, validation-failure, and safe-failure states. A workflow proposal is not a completed booking; required approval and final execution must occur first.

The assistant must never invent facilities, sports, prices, equipment, stock, ratings, opening hours, availability, payment approval, refund completion, booking confirmation, contact details, or policy exceptions. When information is missing, direct the user to the live booking system or support team.

## 11. Frequently Asked Questions

### What facilities are currently available?

The seeded catalogue contains Badminton Court, Cricket Ground, Football Field, Indoor Basketball Arena, Swimming Pool, Table Tennis Court, and Volleyball Court. The live facility catalogue is authoritative.

### What is the cheapest seeded facility?

The Table Tennis Court is listed at LKR 1,000 per hour. Confirm against live data because authorized staff can change prices.

### Can I book for half an hour?

No. Bookings require at least one whole hour and start on a whole hour.

### Can I book after 23:00?

No. A booking can start between 08:00 and 23:00 and must end by midnight.

### Can I pay by bank transfer?

Yes. Upload the bank-transfer slip. The booking remains pending until an authorized Manager or Admin verifies the payment.

### Can I cancel a booking?

Yes, provided it has not expired. The system calculates the refund from the time remaining before the booking starts.

### Can I reschedule because of rain?

An authorized Manager or Admin can request rescheduling for eligible outdoor bookings. The customer must choose another available slot and the system must accept it.

### Are equipment rentals included in the facility price?

No. Equipment is tracked and charged separately unless the live booking details explicitly say otherwise.

### How do I get help?

Create a support request in the web or mobile application. Include the booking ID, facility, and relevant payment or scheduling details. Do not invent a phone number or email address that is not configured by the application.

## 12. Source-of-Truth Priority

When information conflicts, use this order:

1. Live API data for facilities, schedules, availability, bookings, payments, refunds, or equipment.
2. Current backend validation and policy services.
3. Current web and mobile application display.
4. This knowledge base.

This document describes seeded development data and implemented behavior. It is not a substitute for live availability, staff decisions, database state, or production policy updates.
