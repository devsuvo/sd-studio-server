/**
 * Seeds demo accounts, studios and bookings.
 * The Next.js client must be running (CLIENT_URL) because accounts are created
 * through BetterAuth's sign-up endpoint, which owns password hashing.
 *
 *   npm run seed
 */
import { collections, getDb } from "./config/db";
import { env } from "./config/env";
import type { BookingDoc, StudioDoc } from "./types";
import { quote } from "./utils/pricing";

const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1400&q=80`;

const ACCOUNTS = {
  host: { name: "Maya Rahman", email: "host@sdstudio.dev", password: "Host@12345" },
  host2: { name: "Daniel Ortiz", email: "daniel@sdstudio.dev", password: "Host@12345" },
  guest: { name: "Arif Hossain", email: "guest@sdstudio.dev", password: "Guest@12345" },
};

type Account = (typeof ACCOUNTS)[keyof typeof ACCOUNTS];

async function ensureUser(account: Account): Promise<string> {
  const headers = { "Content-Type": "application/json", Origin: env.clientUrl };
  const signUp = await fetch(`${env.clientUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers,
    body: JSON.stringify(account),
  });
  if (signUp.ok) return ((await signUp.json()) as { user: { id: string } }).user.id;

  const signIn = await fetch(`${env.clientUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email: account.email, password: account.password }),
  });
  if (!signIn.ok) throw new Error(`Could not create or sign in ${account.email}: ${await signIn.text()}`);
  return ((await signIn.json()) as { user: { id: string } }).user.id;
}

type StudioSeed = Omit<StudioDoc, "hostId" | "hostName" | "hostEmail" | "createdAt" | "updatedAt">;

const STUDIOS: (StudioSeed & { owner: "host" | "host2" })[] = [
  {
    owner: "host",
    title: "Daylight Cyc Wall Loft",
    description:
      "A 1,800 sq ft top-floor loft with a pre-lit white infinity cyc wall and floor-to-ceiling north-facing windows. Ideal for fashion lookbooks, product campaigns and portrait sessions that need soft, even daylight from morning to late afternoon. A private styling corner with a mirror wall and steamer is included.",
    category: "Photography",
    city: "Dhaka",
    address: "House 42, Road 11, Banani",
    hourlyRate: 45,
    cleaningFee: 15,
    capacity: 12,
    sizeSqft: 1800,
    minHours: 2,
    openHour: 8,
    closeHour: 22,
    amenities: ["Wi-Fi", "Air conditioning", "Makeup station", "Changing room", "Freight elevator", "Kitchenette"],
    equipment: ["Profoto B10 kit (3 heads)", "Seamless paper backdrops", "C-stands", "V-flats", "Tethering table"],
    images: [img("1516035069371-29a1b244cc32"), img("1492691527719-9d1e07e534b4"), img("1524758631624-e2822e304c36")],
    rules: "No confetti or glitter. Paint the cyc floor back to white if you use colored gels on it.",
    rating: 4.9,
    reviewCount: 128,
  },
  {
    owner: "host",
    title: "Soundproof Podcast Lounge",
    description:
      "An acoustically treated lounge set up for two-to-four person video podcasts. Three-camera 4K switching, broadcast microphones and warm practical lighting are ready the moment you walk in. You leave with your multitrack audio and ISO camera files on a drive or via a download link the same day.",
    category: "Podcast",
    city: "Dhaka",
    address: "Level 5, 27 Gulshan Avenue",
    hourlyRate: 35,
    cleaningFee: 0,
    capacity: 6,
    sizeSqft: 420,
    minHours: 1,
    openHour: 9,
    closeHour: 21,
    amenities: ["Wi-Fi", "Air conditioning", "Green room", "Coffee bar", "Street parking"],
    equipment: ["Shure SM7B x4", "RodeCaster Pro II", "Sony FX3 x3", "ATEM Mini Extreme", "Aputure key lights"],
    images: [img("1590602847861-f357a9332bbc"), img("1505740420928-5e560c06d30e")],
    rules: "Food is allowed in the green room only. An engineer is available on request at extra cost.",
    rating: 4.8,
    reviewCount: 94,
  },
  {
    owner: "host2",
    title: "Analog Room Recording Suite",
    description:
      "A tracking room and control room built around a vintage 24-channel console and a well-kept upright piano. The live room is tuned for drums and small ensembles, with two isolation booths for vocals and guitar amps. Engineers and solo artists both feel at home here.",
    category: "Music Recording",
    city: "Chattogram",
    address: "18 CDA Avenue, Nasirabad",
    hourlyRate: 60,
    cleaningFee: 10,
    capacity: 8,
    sizeSqft: 950,
    minHours: 3,
    openHour: 10,
    closeHour: 24,
    amenities: ["Air conditioning", "Lounge", "Kitchenette", "Instrument storage", "Wi-Fi"],
    equipment: ["24-channel analog console", "Pro Tools HDX", "Neumann U87", "Yamaha upright piano", "Drum kit"],
    images: [img("1598488035139-bdbb2231ce04"), img("1511379938547-c1f69419868d")],
    rules: "Bring your own hard drive for session files. Smoking is not allowed in the building.",
    rating: 4.7,
    reviewCount: 61,
  },
  {
    owner: "host2",
    title: "Black Box Sound Stage",
    description:
      "A 4,000 sq ft sound stage with blackout curtains, a full lighting grid and drive-in access for vehicles and set pieces. It suits music videos, commercials and short films that need full control over light and sound. Production office and two dressing rooms are included with every booking.",
    category: "Film & Video",
    city: "Dhaka",
    address: "Plot 7, Tejgaon Industrial Area",
    hourlyRate: 120,
    cleaningFee: 40,
    capacity: 40,
    sizeSqft: 4000,
    minHours: 4,
    openHour: 6,
    closeHour: 24,
    amenities: ["Drive-in loading bay", "Production office", "Dressing rooms", "3-phase power", "Parking"],
    equipment: ["Lighting grid with dimmer board", "Green screen cyc", "Dolly track", "Haze machine"],
    images: [img("1485846234645-a62644f84728"), img("1478720568477-152d9b164e26")],
    rules: "A certificate of insurance is required for crews larger than 15. Pyrotechnics are not allowed.",
    rating: 4.9,
    reviewCount: 47,
  },
  {
    owner: "host",
    title: "Sunlit Painting & Ceramics Workshop",
    description:
      "A bright, airy studio with large easels, two pottery wheels and a small electric kiln. Artists book it for focused solo sessions, and teachers use it for weekend classes of up to ten students. Aprons, drop cloths and a deep utility sink make clean-up quick.",
    category: "Art Workshop",
    city: "Sylhet",
    address: "Zindabazar Main Road, Floor 2",
    hourlyRate: 18,
    cleaningFee: 5,
    capacity: 10,
    sizeSqft: 700,
    minHours: 2,
    openHour: 8,
    closeHour: 20,
    amenities: ["Natural light", "Utility sink", "Storage lockers", "Wi-Fi", "Tea station"],
    equipment: ["10 studio easels", "2 pottery wheels", "Electric kiln", "Drying racks"],
    images: [img("1460661419201-fd4cecdf8a8b"), img("1513364776144-60967b0f800f")],
    rules: "Kiln firing is scheduled with the host and billed separately. Please clean wheels after use.",
    rating: 4.6,
    reviewCount: 38,
  },
  {
    owner: "host2",
    title: "Mirror Wall Dance & Rehearsal Hall",
    description:
      "A sprung hardwood floor, a 12-metre mirror wall and a Bluetooth sound system make this hall a favourite for choreographers, theatre groups and content creators filming dance reels. Bright overhead LEDs can be dimmed for filming.",
    category: "Dance & Rehearsal",
    city: "Dhaka",
    address: "Road 27, Dhanmondi",
    hourlyRate: 25,
    cleaningFee: 0,
    capacity: 25,
    sizeSqft: 1500,
    minHours: 1,
    openHour: 7,
    closeHour: 23,
    amenities: ["Sprung floor", "Mirror wall", "Changing rooms", "Showers", "Air conditioning"],
    equipment: ["Bluetooth PA system", "Ballet barres", "Yoga mats", "Ring light"],
    images: [img("1518611012118-696072aa579a"), img("1519389950473-47ba0277781c")],
    rules: "Indoor shoes only on the sprung floor.",
    rating: 4.5,
    reviewCount: 72,
  },
  {
    owner: "host",
    title: "Moody Tungsten Portrait Studio",
    description:
      "A compact studio painted in deep charcoal, built for low-key portraits, album covers and editorial headshots. Hand-painted canvas backdrops and a tungsten Fresnel kit give a classic cinematic look without much setup time.",
    category: "Photography",
    city: "Chattogram",
    address: "GEC Circle, Block C",
    hourlyRate: 30,
    cleaningFee: 0,
    capacity: 5,
    sizeSqft: 500,
    minHours: 1,
    openHour: 10,
    closeHour: 22,
    amenities: ["Air conditioning", "Makeup station", "Wi-Fi", "Changing room"],
    equipment: ["Arri 650 Fresnels x3", "Hand-painted canvas backdrops", "Godox AD600 Pro", "Reflectors"],
    images: [img("1492691527719-9d1e07e534b4"), img("1516035069371-29a1b244cc32")],
    rules: "Backdrops must be rolled, never folded.",
    rating: 4.8,
    reviewCount: 55,
  },
  {
    owner: "host2",
    title: "Vocal Booth & Mixing Room",
    description:
      "A small, quiet booth with a large-diaphragm condenser and a nearfield mixing setup next door. It's built for voice-over artists, singers and audiobook narrators who need clean takes without paying for a full tracking room.",
    category: "Music Recording",
    city: "Sylhet",
    address: "Amberkhana Point, Suite 3B",
    hourlyRate: 22,
    cleaningFee: 0,
    capacity: 3,
    sizeSqft: 260,
    minHours: 1,
    openHour: 9,
    closeHour: 23,
    amenities: ["Air conditioning", "Wi-Fi", "Lounge"],
    equipment: ["Neumann TLM 103", "Universal Audio Apollo Twin", "Yamaha HS8 monitors", "Logic Pro"],
    images: [img("1505740420928-5e560c06d30e"), img("1598488035139-bdbb2231ce04")],
    rules: "No food or drinks other than water inside the booth.",
    rating: 4.4,
    reviewCount: 29,
  },
  {
    owner: "host",
    title: "Green Screen Content Studio",
    description:
      "A turnkey studio for YouTube creators and brands: a lit green screen wall, teleprompter and a 4K camera on a slider. Show up with a script and leave with footage ready to edit. Live-streaming to multiple platforms is supported.",
    category: "Film & Video",
    city: "Rajshahi",
    address: "Shaheb Bazar Road, Floor 4",
    hourlyRate: 40,
    cleaningFee: 10,
    capacity: 8,
    sizeSqft: 800,
    minHours: 2,
    openHour: 9,
    closeHour: 21,
    amenities: ["Wi-Fi (1 Gbps)", "Air conditioning", "Makeup station", "Green room"],
    equipment: ["Green screen wall", "Teleprompter", "Sony A7S III", "Motorized slider", "LED panels"],
    images: [img("1478720568477-152d9b164e26"), img("1485846234645-a62644f84728")],
    rules: "Avoid wearing green clothing on camera.",
    rating: 4.6,
    reviewCount: 33,
  },
];

async function main() {
  console.log(`Seeding database "${env.dbName}" using auth at ${env.clientUrl}`);

  const ids = {
    host: await ensureUser(ACCOUNTS.host),
    host2: await ensureUser(ACCOUNTS.host2),
    guest: await ensureUser(ACCOUNTS.guest),
  };
  console.log("Accounts ready:", ids);

  const { studios, bookings } = await collections();
  await studios.deleteMany({ hostId: { $in: [ids.host, ids.host2] } });
  await bookings.deleteMany({ $or: [{ guestId: ids.guest }, { hostId: { $in: [ids.host, ids.host2] } }] });

  const now = Date.now();
  const docs: StudioDoc[] = STUDIOS.map(({ owner, ...s }, i) => {
    const account = ACCOUNTS[owner];
    const created = new Date(now - i * 36 * 60 * 60 * 1000);
    return { ...s, hostId: ids[owner], hostName: account.name, hostEmail: account.email, createdAt: created, updatedAt: created };
  });
  const { insertedIds } = await studios.insertMany(docs);
  console.log(`Inserted ${docs.length} studios`);

  const day = (offset: number) => new Date(now + offset * 86_400_000).toISOString().slice(0, 10);
  const makeBooking = (
    studioIndex: number,
    guest: { id: string; name: string; email: string },
    date: string,
    startHour: number,
    endHour: number,
    status: BookingDoc["status"],
    note = "",
  ): BookingDoc => {
    const s = docs[studioIndex];
    const created = new Date();
    return {
      studioId: insertedIds[studioIndex].toString(),
      studio: { title: s.title, image: s.images[0], city: s.city, category: s.category },
      hostId: s.hostId,
      guestId: guest.id,
      guestName: guest.name,
      guestEmail: guest.email,
      date,
      startHour,
      endHour,
      hours: endHour - startHour,
      pricing: quote(s.hourlyRate, s.cleaningFee, endHour - startHour),
      note,
      status,
      createdAt: created,
      updatedAt: created,
    };
  };

  const guest = { id: ids.guest, ...ACCOUNTS.guest };
  const host2AsGuest = { id: ids.host2, ...ACCOUNTS.host2 };

  await bookings.insertMany([
    makeBooking(1, guest, day(2), 10, 13, "confirmed", "Recording a three-person interview episode."),
    makeBooking(3, guest, day(6), 8, 14, "pending", "Music video shoot with a crew of 12."),
    makeBooking(4, guest, day(-10), 9, 12, "confirmed"),
    makeBooking(0, host2AsGuest, day(3), 9, 13, "pending", "Lookbook for a spring apparel line."),
    makeBooking(0, host2AsGuest, day(1), 14, 17, "confirmed"),
  ]);
  console.log("Inserted demo bookings");
}

main()
  .then(async () => {
    console.log("Seed complete.");
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await getDb().catch(() => undefined);
    process.exit(1);
  });
