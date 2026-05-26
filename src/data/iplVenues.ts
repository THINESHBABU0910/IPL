export interface IplVenue {
  id: string;
  name: string;
  shortName: string;
  city: string;
  state: string;
  country: string;
  pitchType: "Flat" | "Balanced" | "Slow" | "Turning" | "Green";
  pitchDescription: string;
  boundarySize: "Small" | "Medium" | "Large";
  typicalDew: "None" | "Moderate" | "Heavy";
  notes: string;
}

export const IPL_VENUES: IplVenue[] = [
  // ── India (IPL & international) ──
  { id: "chepauk", name: "M.A. Chidambaram Stadium, Chepauk", shortName: "Chepauk", city: "Chennai", state: "Tamil Nadu", country: "India", pitchType: "Turning", pitchDescription: "Slow, turning & grip-heavy", boundarySize: "Medium", typicalDew: "Moderate", notes: "Spin-friendly, CSK home" },
  { id: "chinnaswamy", name: "M. Chinnaswamy Stadium", shortName: "Chinnaswamy", city: "Bengaluru", state: "Karnataka", country: "India", pitchType: "Flat", pitchDescription: "Flat, high-scoring, small boundaries", boundarySize: "Small", typicalDew: "Moderate", notes: "RCB home, 200+ common" },
  { id: "wankhede", name: "Wankhede Stadium", shortName: "Wankhede", city: "Mumbai", state: "Maharashtra", country: "India", pitchType: "Balanced", pitchDescription: "Balanced, batting-friendly bounce", boundarySize: "Medium", typicalDew: "Heavy", notes: "MI home, dew in night games" },
  { id: "eden", name: "Eden Gardens", shortName: "Eden Gardens", city: "Kolkata", state: "West Bengal", country: "India", pitchType: "Balanced", pitchDescription: "Balanced with slow evening conditions", boundarySize: "Large", typicalDew: "Moderate", notes: "KKR home, big ground" },
  { id: "arun-jaitley", name: "Arun Jaitley Stadium", shortName: "Arun Jaitley", city: "Delhi", state: "Delhi", country: "India", pitchType: "Flat", pitchDescription: "Flat & batting-friendly", boundarySize: "Medium", typicalDew: "Moderate", notes: "DC home" },
  { id: "sawai-mansingh", name: "Sawai Mansingh Stadium", shortName: "SMS", city: "Jaipur", state: "Rajasthan", country: "India", pitchType: "Balanced", pitchDescription: "Balanced with good carry", boundarySize: "Medium", typicalDew: "Moderate", notes: "RR home" },
  { id: "uppal", name: "Rajiv Gandhi International Cricket Stadium", shortName: "Uppal", city: "Hyderabad", state: "Telangana", country: "India", pitchType: "Balanced", pitchDescription: "Balanced, good for batting & spin", boundarySize: "Medium", typicalDew: "Moderate", notes: "SRH home" },
  { id: "motera", name: "Narendra Modi Stadium", shortName: "Motera", city: "Ahmedabad", state: "Gujarat", country: "India", pitchType: "Flat", pitchDescription: "Flat with big boundaries", boundarySize: "Large", typicalDew: "Moderate", notes: "GT home, world's largest" },
  { id: "mohali", name: "Maharaja Yadavindra Singh International Cricket Stadium", shortName: "Mohali", city: "Mohali", state: "Punjab", country: "India", pitchType: "Balanced", pitchDescription: "Balanced pace & bounce", boundarySize: "Medium", typicalDew: "Moderate", notes: "PBKS home" },
  { id: "ekana", name: "Bharat Ratna Shri Atal Bihari Vajpayee Ekana Cricket Stadium", shortName: "Ekana", city: "Lucknow", state: "Uttar Pradesh", country: "India", pitchType: "Balanced", pitchDescription: "Balanced, slightly slow", boundarySize: "Large", typicalDew: "Moderate", notes: "LSG home" },
  { id: "barsapara", name: "Barsapara Cricket Stadium", shortName: "Barsapara", city: "Guwahati", state: "Assam", country: "India", pitchType: "Balanced", pitchDescription: "Balanced with seam movement", boundarySize: "Medium", typicalDew: "Heavy", notes: "Neutral IPL venue" },
  { id: "vizag", name: "Dr. Y.S. Rajasekhara Reddy ACA-VDCA Cricket Stadium", shortName: "Vizag", city: "Visakhapatnam", state: "Andhra Pradesh", country: "India", pitchType: "Balanced", pitchDescription: "Balanced, batting-friendly", boundarySize: "Medium", typicalDew: "Moderate", notes: "Neutral IPL venue" },
  { id: "dharamsala", name: "HPCA Stadium, Dharamsala", shortName: "Dharamsala", city: "Dharamsala", state: "Himachal Pradesh", country: "India", pitchType: "Green", pitchDescription: "Seaming, high altitude", boundarySize: "Medium", typicalDew: "None", notes: "Swing and seam early" },
  { id: "dharamshala-alt", name: "Himachal Pradesh Cricket Association Stadium", shortName: "HPCA", city: "Dharamsala", state: "Himachal Pradesh", country: "India", pitchType: "Green", pitchDescription: "Green-seaming at altitude", boundarySize: "Medium", typicalDew: "None", notes: "Pacers effective" },
  { id: "mullanpur", name: "Maharaja Yadavindra Singh Stadium, Mullanpur", shortName: "Mullanpur", city: "Mohali", state: "Punjab", country: "India", pitchType: "Balanced", pitchDescription: "Balanced all-round surface", boundarySize: "Medium", typicalDew: "Moderate", notes: "PBKS new home" },

  // ── Australia ──
  { id: "mcg", name: "Melbourne Cricket Ground", shortName: "MCG", city: "Melbourne", state: "Victoria", country: "Australia", pitchType: "Balanced", pitchDescription: "Balanced with good bounce, large outfield", boundarySize: "Large", typicalDew: "None", notes: "Biggest crowd venue, Boxing Day Tests" },
  { id: "scg", name: "Sydney Cricket Ground", shortName: "SCG", city: "Sydney", state: "New South Wales", country: "Australia", pitchType: "Turning", pitchDescription: "Spin-friendly as match progresses", boundarySize: "Medium", typicalDew: "None", notes: "Spinners dominate day 4–5" },
  { id: "adelaide-oval", name: "Adelaide Oval", shortName: "Adelaide Oval", city: "Adelaide", state: "South Australia", country: "Australia", pitchType: "Balanced", pitchDescription: "True bounce, good for batting", boundarySize: "Medium", typicalDew: "None", notes: "Day-night Tests, swing early" },
  { id: "gabba", name: "The Gabba", shortName: "Gabba", city: "Brisbane", state: "Queensland", country: "Australia", pitchType: "Green", pitchDescription: "Pacy, extra bounce, seam movement", boundarySize: "Medium", typicalDew: "None", notes: "Fortress for Australia" },
  { id: "perth", name: "Optus Stadium", shortName: "Perth", city: "Perth", state: "Western Australia", country: "Australia", pitchType: "Green", pitchDescription: "Fast and bouncy", boundarySize: "Large", typicalDew: "None", notes: "Pace paradise" },
  { id: "bellerive", name: "Bellerive Oval", shortName: "Bellerive", city: "Hobart", state: "Tasmania", country: "Australia", pitchType: "Balanced", pitchDescription: "Balanced with swing under lights", boundarySize: "Medium", typicalDew: "Moderate", notes: "BBL & international venue" },

  // ── England ──
  { id: "lords", name: "Lord's Cricket Ground", shortName: "Lord's", city: "London", state: "England", country: "England", pitchType: "Balanced", pitchDescription: "Traditional, swing early, balanced later", boundarySize: "Medium", typicalDew: "None", notes: "Home of cricket" },
  { id: "oval", name: "The Oval", shortName: "The Oval", city: "London", state: "England", country: "England", pitchType: "Balanced", pitchDescription: "Good batting surface, some spin", boundarySize: "Medium", typicalDew: "None", notes: "Ashes & ODI venue" },
  { id: "old-trafford", name: "Old Trafford", shortName: "Old Trafford", city: "Manchester", state: "England", country: "England", pitchType: "Turning", pitchDescription: "Spin-friendly in Tests", boundarySize: "Medium", typicalDew: "None", notes: "Spinners key in longer formats" },
  { id: "edgbaston", name: "Edgbaston Cricket Ground", shortName: "Edgbaston", city: "Birmingham", state: "England", country: "England", pitchType: "Balanced", pitchDescription: "Competitive, good carry", boundarySize: "Medium", typicalDew: "None", notes: "High-intensity venue" },
  { id: "headingley", name: "Headingley Cricket Ground", shortName: "Headingley", city: "Leeds", state: "England", country: "England", pitchType: "Balanced", pitchDescription: "Can assist seamers early", boundarySize: "Medium", typicalDew: "None", notes: "Classic English conditions" },
  { id: "trent-bridge", name: "Trent Bridge", shortName: "Trent Bridge", city: "Nottingham", state: "England", country: "England", pitchType: "Green", pitchDescription: "Seam and swing friendly", boundarySize: "Medium", typicalDew: "None", notes: "Pacers enjoy early overs" },

  // ── South Africa ──
  { id: "wanderers", name: "Wanderers Stadium", shortName: "Wanderers", city: "Johannesburg", state: "Gauteng", country: "South Africa", pitchType: "Balanced", pitchDescription: "High altitude, good bounce", boundarySize: "Medium", typicalDew: "None", notes: "High-scoring ODI venue" },
  { id: "newlands", name: "Newlands Cricket Ground", shortName: "Newlands", city: "Cape Town", state: "Western Cape", country: "South Africa", pitchType: "Green", pitchDescription: "Seam movement, swing under cloud", boundarySize: "Medium", typicalDew: "Moderate", notes: "Beautiful ground, swing paradise" },
  { id: "kingsmead", name: "Kingsmead", shortName: "Kingsmead", city: "Durban", state: "KwaZulu-Natal", country: "South Africa", pitchType: "Balanced", pitchDescription: "Humid, some spin and pace", boundarySize: "Medium", typicalDew: "Heavy", notes: "Dew factor in night games" },
  { id: "super-sport", name: "SuperSport Park", shortName: "Centurion", city: "Centurion", state: "Gauteng", country: "South Africa", pitchType: "Flat", pitchDescription: "Flat, high-scoring", boundarySize: "Medium", typicalDew: "None", notes: "400+ ODI totals possible" },

  // ── New Zealand ──
  { id: "eden-park", name: "Eden Park", shortName: "Eden Park", city: "Auckland", state: "Auckland", country: "New Zealand", pitchType: "Balanced", pitchDescription: "Small boundaries, high scores", boundarySize: "Small", typicalDew: "Moderate", notes: "Short boundaries boost sixes" },
  { id: "hagley", name: "Hagley Oval", shortName: "Hagley Oval", city: "Christchurch", state: "Canterbury", country: "New Zealand", pitchType: "Green", pitchDescription: "Seam-friendly early", boundarySize: "Medium", typicalDew: "None", notes: "Swing under overcast skies" },
  { id: "basin-reserve", name: "Basin Reserve", shortName: "Basin Reserve", city: "Wellington", state: "Wellington", country: "New Zealand", pitchType: "Balanced", pitchDescription: "Windy, balanced pitch", boundarySize: "Medium", typicalDew: "None", notes: "Wind affects hitting" },
  { id: "seddon-park", name: "Seddon Park", shortName: "Seddon Park", city: "Hamilton", state: "Waikato", country: "New Zealand", pitchType: "Balanced", pitchDescription: "Good batting track", boundarySize: "Medium", typicalDew: "Moderate", notes: "NZ home ODI venue" },

  // ── Pakistan ──
  { id: "gaddafi", name: "Gaddafi Stadium", shortName: "Gaddafi", city: "Lahore", state: "Punjab", country: "Pakistan", pitchType: "Flat", pitchDescription: "Flat, batting-friendly", boundarySize: "Medium", typicalDew: "Moderate", notes: "PCB headquarters venue" },
  { id: "national-karachi", name: "National Bank Cricket Arena", shortName: "Karachi", city: "Karachi", state: "Sindh", country: "Pakistan", pitchType: "Balanced", pitchDescription: "Balanced, good for spin later", boundarySize: "Medium", typicalDew: "Heavy", notes: "Night games, dew impact" },
  { id: "rawalpindi", name: "Rawalpindi Cricket Stadium", shortName: "Rawalpindi", city: "Rawalpindi", state: "Punjab", country: "Pakistan", pitchType: "Flat", pitchDescription: "Flat, high-scoring", boundarySize: "Medium", typicalDew: "Moderate", notes: "PSL & international" },

  // ── Sri Lanka ──
  { id: "r-premadasa", name: "R. Premadasa Stadium", shortName: "Premadasa", city: "Colombo", state: "Western Province", country: "Sri Lanka", pitchType: "Slow", pitchDescription: "Slow, spin-friendly", boundarySize: "Medium", typicalDew: "Heavy", notes: "Spin dominates, dew at night" },
  { id: "galle", name: "Galle International Stadium", shortName: "Galle", city: "Galle", state: "Southern Province", country: "Sri Lanka", pitchType: "Turning", pitchDescription: "Sharp turn for spinners", boundarySize: "Medium", typicalDew: "Moderate", notes: "Spinners paradise" },
  { id: "pallekele", name: "Pallekele International Cricket Stadium", shortName: "Pallekele", city: "Kandy", state: "Central Province", country: "Sri Lanka", pitchType: "Balanced", pitchDescription: "Balanced with some turn", boundarySize: "Medium", typicalDew: "Moderate", notes: "Hill-country venue" },

  // ── Bangladesh ──
  { id: "sher-e-bangla", name: "Sher-e-Bangla National Cricket Stadium", shortName: "Sher-e-Bangla", city: "Dhaka", state: "Dhaka", country: "Bangladesh", pitchType: "Slow", pitchDescription: "Slow, low bounce, spin-friendly", boundarySize: "Medium", typicalDew: "Heavy", notes: "BPL & international hub" },
  { id: "chattogram", name: "Zahur Ahmed Chowdhury Stadium", shortName: "Chattogram", city: "Chattogram", state: "Chattogram", country: "Bangladesh", pitchType: "Balanced", pitchDescription: "Balanced with spin assist", boundarySize: "Medium", typicalDew: "Moderate", notes: "Coastal conditions" },

  // ── West Indies ──
  { id: "kensington", name: "Kensington Oval", shortName: "Kensington Oval", city: "Bridgetown", state: "Barbados", country: "West Indies", pitchType: "Balanced", pitchDescription: "Balanced Caribbean track", boundarySize: "Medium", typicalDew: "None", notes: "Historic WI venue" },
  { id: "providence", name: "Providence Stadium", shortName: "Providence", city: "Georgetown", state: "Guyana", country: "West Indies", pitchType: "Balanced", pitchDescription: "Good for batting", boundarySize: "Medium", typicalDew: "Moderate", notes: "CPL & international" },
  { id: "queens-park", name: "Queen's Park Oval", shortName: "QPO", city: "Port of Spain", state: "Trinidad", country: "West Indies", pitchType: "Slow", pitchDescription: "Slow, spin-friendly", boundarySize: "Medium", typicalDew: "Moderate", notes: "Spin key in middle overs" },
  { id: "sabina", name: "Sabina Park", shortName: "Sabina Park", city: "Kingston", state: "Jamaica", country: "West Indies", pitchType: "Green", pitchDescription: "Pacy, bouncy", boundarySize: "Medium", typicalDew: "None", notes: "Fast bowlers enjoy" },

  // ── UAE ──
  { id: "dubai", name: "Dubai International Cricket Stadium", shortName: "Dubai", city: "Dubai", state: "Dubai", country: "UAE", pitchType: "Slow", pitchDescription: "Slow, low-scoring T20s", boundarySize: "Large", typicalDew: "Heavy", notes: "IPL neutral, dew dominant" },
  { id: "abu-dhabi", name: "Sheikh Zayed Stadium", shortName: "Abu Dhabi", city: "Abu Dhabi", state: "Abu Dhabi", country: "UAE", pitchType: "Balanced", pitchDescription: "Balanced, bigger ground", boundarySize: "Large", typicalDew: "Heavy", notes: "Chasing tough under dew" },
  { id: "sharjah", name: "Sharjah Cricket Stadium", shortName: "Sharjah", city: "Sharjah", state: "Sharjah", country: "UAE", pitchType: "Flat", pitchDescription: "Flat, smaller boundaries", boundarySize: "Small", typicalDew: "Heavy", notes: "High-scoring T20 venue" },

  // ── USA ──
  { id: "central-broward", name: "Central Broward Regional Park", shortName: "Central Broward", city: "Lauderhill", state: "Florida", country: "USA", pitchType: "Balanced", pitchDescription: "Balanced American venue", boundarySize: "Medium", typicalDew: "Moderate", notes: "USA home cricket venue" },
  { id: "grand-prairie", name: "Grand Prairie Stadium", shortName: "Grand Prairie", city: "Dallas", state: "Texas", country: "USA", pitchType: "Flat", pitchDescription: "Flat, batting-friendly", boundarySize: "Medium", typicalDew: "Moderate", notes: "Major League Cricket venue" },

  // ── Afghanistan ──
  { id: "sharjah-afg", name: "Sharjah Cricket Stadium (Afghan home)", shortName: "Sharjah AFG", city: "Sharjah", state: "Sharjah", country: "UAE", pitchType: "Balanced", pitchDescription: "Balanced neutral venue", boundarySize: "Medium", typicalDew: "Heavy", notes: "Afghanistan home base" },

  // ── Ireland ──
  { id: "malahide", name: "Malahide Cricket Club Ground", shortName: "Malahide", city: "Dublin", state: "Leinster", country: "Ireland", pitchType: "Balanced", pitchDescription: "Balanced, seam under cloud", boundarySize: "Medium", typicalDew: "None", notes: "Ireland home venue" },

  // ── Zimbabwe ──
  { id: "harare", name: "Harare Sports Club", shortName: "Harare", city: "Harare", state: "Harare", country: "Zimbabwe", pitchType: "Balanced", pitchDescription: "Balanced, good for batting", boundarySize: "Medium", typicalDew: "None", notes: "Zimbabwe home ground" },

  // ── Nepal ──
  { id: "tribhuvan", name: "Tribhuvan University International Cricket Ground", shortName: "TU Ground", city: "Kirtipur", state: "Bagmati", country: "Nepal", pitchType: "Balanced", pitchDescription: "Balanced at altitude", boundarySize: "Medium", typicalDew: "None", notes: "Nepal home venue" },
];

export function getVenueById(id: string): IplVenue | undefined {
  return IPL_VENUES.find((v) => v.id === id);
}

export function getVenueLabel(v: IplVenue): string {
  return `${v.name} — ${v.city}, ${v.country}`;
}

export function getVenuesByCountry(country: string): IplVenue[] {
  return IPL_VENUES.filter((v) => v.country === country);
}

export const VENUE_COUNTRIES = [...new Set(IPL_VENUES.map((v) => v.country))].sort();
