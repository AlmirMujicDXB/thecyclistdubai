/* =====================================================================
   TheCyclistDubai Weather: SITE CONTENT
   Edit this file to add sponsors, events and group rides.
   Everything on the page and in the Share menu updates automatically.
   Past events and one-off rides hide themselves after they finish.

   Dates: 'YYYY-MM-DD'   Times: 'HH:MM' (24h, Dubai time)
   ===================================================================== */
window.SITE = {

  links: {
    whatsappGroup: 'https://chat.whatsapp.com/HJNHNBjf88KEudF1uojZIo?mode=gi_t',
    instagram: 'https://www.instagram.com/thecyclistdubai/',
    strava: 'https://www.strava.com/athletes/13924498',
  },

  /* ---------- SPONSORS ----------
     Shown in every share message with their discount code. */
  sponsors: [
    {
      name: 'Lameda',
      what: 'premium cycling apparel',
      url: 'https://lameda.cc/',
      code: 'DXB',
      discount: '15% OFF',
    },
    // { name: 'Brand', what: 'what they sell', url: 'https://…', code: 'CODE', discount: '10% OFF' },
  ],

  /* ---------- EVENTS ----------
     Shown under the map (blue cards), newest first. */
  events: [
    {
      name: 'AD Ports Group Gran Fondo Abu Dhabi 2026',
      date: '2026-12-20',
      time: '07:00',
      distance: '150 km',
      route: 'Al Ain → Abu Dhabi',
      note: 'UCI Gran Fondo World Series qualifier',
      url: 'https://abudhabigranfondo.ae/',
      tag: 'Highly recommended',
      weRide: true,              // adds "We're riding it 🚴"
    },
    // { name: 'Event name', date: '2027-01-30', time: '06:00', distance: '100 km', route: 'Start → Finish',
    //   note: 'Short highlight', url: 'https://…', tag: 'Upcoming event', weRide: false },
  ],

  /* ---------- GROUP RIDES ----------
     Use  weekly: 'Sat'  (Sun Mon Tue Wed Thu Fri Sat) for a repeating ride,
     or   date: '2026-12-05'  for a one-off ride.
     track: alqudra | meydan | mushrif | kite | hatta  (used for the ride forecast) */
  rides: [
    {
      name: 'TCD Ride',
      weekly: 'Sat',
      time: '06:30',
      distance: '86 km',
      place: 'Al Qudra',
      track: 'alqudra',
      pace: '33–35 km/h avg',
      join: 'https://chat.whatsapp.com/HJNHNBjf88KEudF1uojZIo?mode=gi_t',
      location: 'https://maps.app.goo.gl/ntyxGBSEaKip7akR8',
    },
    // { name: 'Recovery Ride', date: '2026-12-02', time: '06:00', distance: '40 km', place: 'Meydan',
    //   track: 'meydan', pace: '28–30 km/h avg', join: 'https://chat.whatsapp.com/…', location: 'https://maps.app.goo.gl/…' },
  ],
};
