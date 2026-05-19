# TODO: Spot — Sands Calendar Integration

## Priority: MEDIUM

### Issue: No Interface with Sands
Spot books appointments at external venues (salons, restaurants) but doesn't write them to the user's calendar. The booked appointment may not appear in the user's schedule, leading to double-bookings or missed appointments.

### Proposed Change
After successful booking, Spot should call Sands to create a calendar event with:
- Venue name and address
- Service type
- Date/time
- Confirmation number
- Notes (special requests, etc.)

### Steps
1. Add Sands write step to Spot's booking confirmation pipeline
2. Define event schema for booked appointments
3. Add conflict check: if Sands reports a conflict, notify user before confirming booking
4. Add rollback: if Sands write fails, cancel the booking

### Dependencies
- Sands must be initialized and calendar accessible
- No changes to Spot's existing booking flow

### Risk
Low — additive only, no existing behavior changes
