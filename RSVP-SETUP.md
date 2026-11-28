# Ride RSVP

Riders can put their name down on the TCD Ride page and the Purple Ride page. The sign-up sits under the big ride card, before the rest of the page. It is the same block on both pages. Only the ride it belongs to changes.

This is not on the live site until this branch is merged. GitHub Pages publishes `main`.

## What a rider does

They type an email (required) and a name (optional), then press **Confirm I'm coming**.

- If it saves, the form is replaced with a short confirmation.
- If that email is already signed up for this ride, they see: "This email is already on the list for this ride." The same address with different capital letters counts as the same email.
- If the address looks wrong, or the save does not go through, they see a plain sentence. No error codes.

## What everyone else sees

**Who's coming** lists a first name and a last initial, plus how many people that is. Emails are not on that list. The organizer can see the full email in the Supabase table.

The list refreshes about every 20 seconds, and again right after a successful sign-up.

The list is real people only: a first name and a last initial, and the count. It sits at the top of the sign-up block and refreshes right after someone confirms, then about every 20 seconds. When nobody has signed up, the page says **Be the first to join**. If the list cannot be loaded, it says so in plain words. It does not show example names.

The ride pages ask for a fresh copy of the sign-up files every minute (`?v=` on the CSS and JS, the same idea as the homepage). GitHub otherwise keeps a file for about 10 minutes, which is why a laptop that already had the ride page open can keep the old page with no sign-up, while a phone that opens the link later sees it. The sign-up block is drawn before the Supabase download finishes, so a slow or blocked download cannot leave the block off the page.

## Where it is saved

Project: `https://gtrjgfpxveiaytxmzeso.supabase.co`

Table: `public.rsvps`

| What | Where it comes from |
| --- | --- |
| `ride_ref` | `data-ride-ref` on the page. TCD Ride is `tcd-ride`. Purple Ride is `purple-ride`. |
| `ride_date` | The day selected on the ride page (the chips under "Plan for"). Asia/Dubai calendar date. |
| `ride_time` | The scheduled start for that date (`time` in site-data.js, or that date's `changes.time`). Asia/Dubai wall clock. The planner's start clock does not change this. |
| `email` | The form, stored in lower case. |
| `name` | The form, or empty. |
| `status` | `confirmed` |
| `confirmed` | true |

One email can sign up once for each occurrence of TCD Ride and once for each occurrence of Purple Ride. A second try for the same ride, date and start time is refused by the database (unique on ride ref + date + time + email). Next week's date is a new occurrence, so the same email can confirm again. Old rows are kept.

The public list is not a direct read of the table. The page calls `ride_occurrence_attendees(ride_ref, ride_date, ride_time)`, which returns only the short name, the status, and the count for that occurrence. `ride_attendees(ride_ref)` remains for older pages: it returns confirmations whose scheduled start is still in the future in Asia/Dubai, and hides ones that have already started. The visitor key in `js/supabase-config.js` is the publishable key. It is allowed to insert a row and to call those functions. It is not allowed to read the table, so the page never asks the insert to return the new row.

The list is that Tuesday or that Thursday on its own. After the start time passes, the ride page moves to the next week and the count starts at zero. Nothing is deleted.

Rows whose `ride_ref` starts with `test-` are checks made while building this. They are not real riders. You can delete them in the Supabase table editor when you like.

## Preview

From the homepage, the Group rides block sits above the header. Each ride card opens its own page:

- The TCD card (Details, or a click on the card itself) opens `tcd-ride.html`.
- The Purple card opens `purple-ride.html`.
- Share stays on the card and does not open the page. A swipe moves to the next card and does not open it.

On the ride page, scroll just under the green or purple ride card. That is the RSVP.

To look at it before merge, open the branch files with a local web server (the page loads the map, fonts, and Supabase, so opening the file directly is a poor preview). Nothing here is linked from the live homepage until merge.

## Go live later

1. Read the pull request and merge it into `main` when you are happy with it. Pages will publish the two ride pages with the RSVP on them.
2. The occurrence columns and functions are in `supabase/migrations/20261128033000_rsvp_per_occurrence.sql`. They are already applied on the live project. Do not delete rows to reset a week.
3. Do not put a service-role key, secret key, or database password in the site. The publishable key in `js/supabase-config.js` is the only key the pages need.
4. Real sign-ups use `tcd-ride` and `purple-ride`. Leave those refs as they are unless you want a new list.

## Add it to another ride page

1. Link `rsvp-widget.css` in the page head.
2. After `ride-page.js`, add a mount and the three scripts, the same way `tcd-ride.html` does.
3. Set `data-ride-ref` to a new slug that is not `tcd-ride` or `purple-ride`. That slug is the list. Same table, separate people.

Each date already has its own list. Use the same `data-ride-ref` every week. The ride page passes that week's date and scheduled start time.
