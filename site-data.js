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
    bikeRental: 'https://wolfis.ae/pages/rental-bikes',   // Wolfi's bike rental (every "Bike rental" button links here)
    bikeRentalLogo: 'https://wolfis.ae/cdn/shop/files/WOLFIS_HOMEPAGE_TOP_LOGO_24_YEARS.png?v=1787554065&width=420',
  },

  /* ---------- SPONSORS ----------
     Shown in every share message with their discount code. */
  sponsors: [
    {
      name: 'Lameda',
      what: 'premium cycling apparel',
      url: 'https://www.lameda.cc/DXB',
      code: 'DXB25',              // coupon code (add discount: '25% OFF' etc. if you want the % shown)
    },
    {
      name: 'Tukus Wheels',
      what: 'carbon wheelsets',
      url: 'https://www.tukuswheels.com/?ref=DXB',
      code: 'DXB',
      kind: 'referral code',      // shown as "use referral code DXB for 10% OFF"
      discount: '10% OFF',
    },
    {
      name: "L'Étape Dubai by Tour de France",
      short: "L'Étape Dubai",           // short name used in ride shares (WhatsApp limit)
      what: 'race entry',
      url: 'https://haku.ly/e1265eb830',
      code: 'THECYCLISTDUBAI15',
      discount: '15% OFF',
    },
    // { name: 'Brand', what: 'what they sell', url: 'https://…', code: 'CODE', discount: '10% OFF' },  // discount optional; kind: 'referral code' optional
  ],

  /* ---------- EVENTS ----------
     Shown under the map, soonest first. theme: 'yellow' (L'Étape) or 'lime' (Spinneys green) for a coloured card (default blue). Leave out time if not announced (shows 'time TBC').
     code + discount: discount code shown on the card and in shares.
     Every upcoming event (link + code) is added to every group ride share automatically. */
  events: [
    {
      ref: 'gran-fondo-abu-dhabi-2026',  // stable id for the homepage "I'm going" count
      name: 'AD Ports Group Gran Fondo Abu Dhabi 2026',
      short: 'Gran Fondo Abu Dhabi',           // short name used in ride shares (WhatsApp limit)
      date: '2026-12-20',
      time: '07:00',
      distance: '150 km',
      route: 'Al Ain → Abu Dhabi',
      note: 'UCI Gran Fondo World Series qualifier',
      url: 'https://abudhabigranfondo.ae/',
      tag: 'Highly recommended',
      weRide: true,              // adds "We're riding it 🚴"
    },
    {
      name: "L'Étape Dubai by Tour de France",
      ref: 'letape-dubai-2027',          // stable id for the homepage "I'm going" count
      short: "L'Étape Dubai",           // short name used in ride shares (WhatsApp limit)
      date: '2027-03-21',          // race day (Family Day is Sat 20 Mar)
      time: '06:30',
      distance: 'Epic 100.5 km · Classic 62 km',
      note: 'Family Day Sat 20 Mar',
      url: 'https://haku.ly/e1265eb830',   // registration link
      tag: 'Highly recommended',
      theme: 'yellow',             // yellow card + yellow share image
      code: 'THECYCLISTDUBAI15',   // discount code (shown on the card and in shares)
      discount: '15% OFF',
      button: 'Register',
    },
    {
      ref: 'spinneys-dubai-92-2027',     // stable id for the homepage "I'm going" count
      name: 'Spinneys Dubai 92 Cycle Challenge',
      short: 'Spinneys Dubai 92',           // short name used in ride shares (WhatsApp limit)
      date: '2027-02-07',          // 17th edition, main event (start time not announced yet)
      distance: '92 km',
      route: 'Expo City Dubai',
      note: '17th edition',
      url: 'https://cyclechallenge.ae/',
      tag: 'Highly recommended',
      theme: 'lime',               // Spinneys green & lime card
    },
    // { name: 'Event name', date: '2027-01-30', time: '06:00', distance: '100 km', route: 'Start → Finish',
    //   note: 'Short highlight', url: 'https://…', tag: 'Upcoming event', weRide: false },
  ],

  /* ---------- RULE FOR EVERY GROUP RIDE ----------
     Shown on every ride card and in every ride share. A ride can override it with  rule: '…'  */
  rideRule: 'Lights & helmet mandatory',

  /* ---------- GROUP RIDES ----------
     Use  weekly: 'Sat'  (Sun Mon Tue Wed Thu Fri Sat) for a repeating ride: as soon as its start
          time passes it moves to the same day and time next week automatically.
     or   date: '2026-12-05'  for a one-off ride (hidden once its start time passes).
     start: meeting point shown on the card and in every share (optional)
     type: e.g. 'MTB / Gravel' (optional) · distance is optional
     until: 'YYYY-MM-DD' last date of a weekly ride (optional) · from: first date (optional)
     track: alqudra | meydan | mushrif | kite | hatta  (used for the ride forecast)
     changes: one-off changes for a single date, e.g. { '2026-11-21': { time: '06:00' } }
              or { '2026-12-25': { cancelled: true } } */
  /* UAE Tour live counter in the header. It shows one race at a time (first in this list first) and slides to the next every 5 s; it counts down, shows "LIVE · Stage X/N" while
     it runs and "Finished" afterwards. Add next year's races here when the dates are announced. */
  uaeTour: {
    url: 'https://www.theuaetour.com/',
    races: [
      { name: 'Men',   start: '2027-02-15', end: '2027-02-21', stages: 7 },   // shown first
      { name: 'Women', start: '2027-02-03', end: '2027-02-06', stages: 4 },
    ],
  },

  rides: [
    {
      name: 'Purple Ride',
      preset: 'mosque',   // track shape for the share image (route-presets.js)
      weekly: 'Thu',               // every Thursday
      time: '06:45',
      type: 'Road',
      distance: '58.5 km',         // from the owner's GPX (purple-ride.gpx): 29.25 km each way, 145 m climbing
      route: 'BOTS → Mosque & back',     // mosque by Bab Al Shams
      page: 'purple-ride.html',
      stopMin: 15,                 // 15-minute break at the Mosque turnaround (in the ride page schedule)
      strava: 'https://www.strava.com/clubs/1886885/group_events/3560231387685719248/occurrences/FQIWoLOg07HlvehiHBTUHxQWFDQUDBQ8FAAAHBaA4YHbwmgAAA==',  // Join ride on the ride page    // ride page: map, wind, forecast, planner, GPX download (the card links to it)
      place: 'Al Qudra',
      start: 'BOTS',
      track: 'alqudra',
      pace: '32 km/h avg',
      join: 'https://chat.whatsapp.com/HJNHNBjf88KEudF1uojZIo?mode=gi_t',
      location: 'https://maps.app.goo.gl/ntyxGBSEaKip7akR8',
      theme: 'purple',             // purple ride card + share image
    },
    {
      name: 'TCD Ride',
      preset: 'zads',   // track shape for the share image (route-presets.js)
      weekly: 'Tue',               // every Tuesday, for four months
      until: '2027-03-23',         // last ride: Tue 23 Mar 2027
      time: '06:45',
      type: 'Road',
      distance: '38.1 km',         // owner's GPX tcd-ride.gpx: BOTS → ZADS & back, turnaround km 18.9, 118 m climbing
      route: 'BOTS → ZADS & back',
      place: 'Al Qudra',
      start: 'BOTS',
      track: 'alqudra',
      pace: '30 km/h avg',
      join: 'https://chat.whatsapp.com/HJNHNBjf88KEudF1uojZIo?mode=gi_t',
      location: 'https://maps.app.goo.gl/ntyxGBSEaKip7akR8',
      strava: 'https://www.strava.com/clubs/1886885/group_events/3560241772478523600/occurrences/FQIWoKO3se7BwuhiHBTUHxQYFAIUDBRaFAAAHBbA_-33xWgAAA==',  // Join ride on Strava (ride page)
      page: 'tcd-ride.html',       // ride page (the card's Details button); route = tcd-ride.gpx
    },
    // theme: 'purple' | 'orange' (default green)
    // { name: 'Recovery Ride', date: '2026-12-02', time: '06:00', distance: '40 km', place: 'Meydan',
    //   track: 'meydan', pace: '28–30 km/h avg', join: 'https://chat.whatsapp.com/…', location: 'https://maps.app.goo.gl/…' },
  ],
};
