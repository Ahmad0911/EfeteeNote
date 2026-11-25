# Efetee Management Notebook: Setup (about 10 minutes, free)

**What it is:** a private online notebook for 1 or 2 managers. Log in, check which apartments are free, record bookings, download a simple Excel. Both people see the same data.
It cannot be seen without a login, and nothing can be deleted (cancel instead).

## Start straight away (one computer)
Double-click `dist/index.html`. The first time, it asks you to **create your login** (email and password). From then on it asks for them every time. Everything you record is encrypted with that password and stored on that computer only.
If the password is forgotten the data cannot be recovered, so download the Excel regularly.

## Share it between two people or devices (online login)
This step is only needed if both managers must see the same data from different computers or phones.
1. **Create the database.** Sign up free at supabase.com, click *New project* (pick a region near Nigeria, save the password).
2. **Load the notebook.** Open *SQL Editor > New query*, paste everything from `supabase/notebook.sql`, click *Run*. This creates the tables and your 19 apartments with their rates.
3. **Create the logins.** Open *Authentication > Users > Add user > Create new user*. Add each manager's email and a password, and tick *Auto Confirm User*.
4. **Close the door.** Open *Authentication > Sign In / Providers* and turn **off** "Allow new users to sign up", so only the people you added can get in.
5. **Connect.** Open *Project Settings > API*. Copy the **Project URL** and the **anon public** key into `dist/config.js`:
   ```js
   window.EFETEE_NOTEBOOK = { supabaseUrl: "https://xxxx.supabase.co", supabaseAnonKey: "eyJ..." };
   ```
6. **Upload** the whole `dist/` folder to any web hosting (or Netlify/Cloudflare Pages, free). Open the address, sign in.

## Using it
- **Availability:** pick From/To dates to see what is free (with prices), tap **Book**. The calendar shows 14 days; tap a free square to book it, tap a coloured square to open that booking.
- **New booking:** guest, phone, apartment, dates. The amount fills in from the rate (change it if you agreed a different price). Enter what was paid; balance is worked out for you.
- **Status:** Booked, Checked in, Checked out, Cancelled. Paying and arriving are separate, so a guest can be booked without paying or pay before arriving. To remove a booking, set it to Cancelled; this frees the apartment.
- **Shared flats:** booking one bedroom of Flats 2 to 5 blocks the whole flat, and booking the whole flat blocks its bedrooms. The other bedroom stays bookable.
- **Apartments:** edit names and rates, or add more.
- **Download Excel:** Bookings (with Nights, Balance formulas), Availability for the next 31 days, Summary totals, Apartments. Each booking shows who last changed it.

## Honest notes
- Free Supabase projects pause after about a week of no use; open the dashboard and click *Restore* if that happens. Download the Excel regularly as a backup.
- Two people editing the same booking at the same moment: the last save wins. A double booking of the same apartment is blocked by the database.
- Please confirm the apartment list and rates match reality (Flat 1 and 6 room layout especially).
