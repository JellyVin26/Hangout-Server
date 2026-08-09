import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'password123';

const USERS = [
  { email: 'maya@hangout.app', username: 'maya', displayName: 'Maya Chen', bio: 'Coffee first, plans later ☕' },
  { email: 'leo@hangout.app', username: 'leo', displayName: 'Leo Martins', bio: 'Arcade king 👾' },
  { email: 'sofia@hangout.app', username: 'sofia', displayName: 'Sofia Reyes', bio: 'Foodie explorer 🍜' },
  { email: 'noah@hangout.app', username: 'noah', displayName: 'Noah Kim', bio: 'Golden hour chaser 📸' },
  { email: 'priya@hangout.app', username: 'priya', displayName: 'Priya Nair', bio: 'Pour-over purist ☕' },
  { email: 'aisha@hangout.app', username: 'aisha', displayName: 'Aisha Bello', bio: 'Always down to hang' },
  { email: 'demo@hangout.app', username: 'demo', displayName: 'Demo User', bio: 'Try everything' },
];

const PLACES = [
  { name: 'Ember & Oak', category: 'Cafe', address: '14 Riverside Walk', lat: 1.2904, lng: 103.8522, rating: 4.8, reviewCount: 212, priceLevel: 2, photoUrl: '/img/cafe-ember.jpg', openHours: '7 AM - 10 PM' },
  { name: 'Neon Arcade', category: 'Gaming', address: '88 Circuit Lane', lat: 1.2931, lng: 103.8555, rating: 4.6, reviewCount: 168, priceLevel: 2, photoUrl: '/img/arcade-neon.jpg', openHours: '11 AM - 2 AM' },
  { name: 'Harbor Ramen', category: 'Food', address: '33 Quay Street', lat: 1.2869, lng: 103.8508, rating: 4.7, reviewCount: 340, priceLevel: 2, photoUrl: '/img/ramen-harbor.jpg', openHours: '11 AM - 11 PM' },
  { name: 'Summit Trailhead', category: 'Hiking', address: 'Bukit Vista Road', lat: 1.3012, lng: 103.8461, rating: 4.5, reviewCount: 95, priceLevel: 1, photoUrl: '/img/trail-summit.jpg', openHours: '5 AM - 7 PM' },
  { name: 'Velvet Rooftop', category: 'Nightlife', address: '21 Skyline Ave', lat: 1.2958, lng: 103.8583, rating: 4.4, reviewCount: 280, priceLevel: 3, photoUrl: '/img/rooftop-velvet.jpg', openHours: '5 PM - 3 AM' },
  { name: 'Canvas & Clay', category: 'Study', address: '5 Artisan Row', lat: 1.2884, lng: 103.8497, rating: 4.3, reviewCount: 120, priceLevel: 1, photoUrl: '/img/study-canvas.jpg', openHours: '8 AM - 11 PM' },
];

const BADGES: { key: 'EXPLORER' | 'CAFE_HUNTER' | 'FOODIE' | 'WEEKEND_WARRIOR' | 'ORGANIZER' | 'EARLY_BIRD'; name: string; emoji: string; description: string }[] = [
  { key: 'EXPLORER', name: 'Explorer', emoji: '🧭', description: 'Visited 10+ unique places' },
  { key: 'CAFE_HUNTER', name: 'Cafe Hunter', emoji: '☕', description: 'Visited 5 cafes' },
  { key: 'FOODIE', name: 'Foodie', emoji: '🍜', description: 'Visited 8 restaurants' },
  { key: 'WEEKEND_WARRIOR', name: 'Weekend Warrior', emoji: '🏕️', description: '8 weekend hangouts' },
  { key: 'ORGANIZER', name: 'Organizer', emoji: '📅', description: 'Hosted 5 hangouts' },
  { key: 'EARLY_BIRD', name: 'Early Bird', emoji: '🌅', description: 'Arrived first to 3 hangouts' },
];

const INTERESTS = ['Coffee', 'Food', 'Gaming', 'Hiking', 'Nightlife', 'Study', 'Shopping', 'Travel'];

async function main() {
  console.log('Seeding...');

  // ── idempotent: wipe existing data ──
  await prisma.memoryReaction.deleteMany();
  await prisma.memory.deleteMany();
  await prisma.message.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.hangoutInvite.deleteMany();
  await prisma.locationSession.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.hangout.deleteMany();
  await prisma.favoritePlace.deleteMany();
  await prisma.reviewLike.deleteMany();
  await prisma.review.deleteMany();
  await prisma.friendRequest.deleteMany();
  await prisma.friend.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.userInterest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.place.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.user.deleteMany();
  console.log('cleared old data');

  // users with hashed passwords
  const hash = bcrypt.hashSync(PASSWORD, 10);
  const users = [];
  for (const u of USERS) {
    users.push(await prisma.user.create({ data: { ...u, passwordHash: hash } }));
  }
  console.log(`users: ${users.length}`);

  // contact graph: chain + hub so everyone connects
  for (let i = 0; i < users.length - 1; i++) {
    await prisma.friend.create({ data: { userId: users[i].id, friendId: users[i + 1].id } });
    await prisma.friend.create({ data: { userId: users[i + 1].id, friendId: users[i].id } });
  }
  const maya = users[0];
  for (let i = 2; i < users.length; i++) {
    await prisma.friend.create({ data: { userId: maya.id, friendId: users[i].id } });
    await prisma.friend.create({ data: { userId: users[i].id, friendId: maya.id } });
  }
  console.log('friends: linked');

  // places
  const placeRows = [];
  for (const p of PLACES) {
    placeRows.push(await prisma.place.create({ data: p }));
  }
  console.log(`places: ${placeRows.length}`);

  // reviews from users
  const reviewSeeds = [
    [placeRows[0], users[4], 5, 'The pour over here ruined other coffee for me. Window seats are prime.'],
    [placeRows[0], users[3], 4, 'Great light at golden hour. Brick wall is a solid photo backdrop.'],
    [placeRows[0], users[5], 4, 'Busy on weekends, quiet on weekday mornings.'],
    [placeRows[1], users[1], 5, 'Pinball heaven. The skeeball machine is dangerously addictive.'],
    [placeRows[2], users[2], 5, 'Tonkotsu broth is rich and deeply savory. Worth the queue.'],
  ] as const;
  for (const [place, author, rating, comment] of reviewSeeds) {
    await prisma.review.create({ data: { placeId: place.id, authorId: author.id, rating, comment } });
  }
  console.log(`reviews: ${reviewSeeds.length}`);

  // badges
  for (const b of BADGES) {
    await prisma.badge.create({ data: b });
  }
  // + interests
  for (const name of INTERESTS) {
    await prisma.interest.create({ data: { name } });
  }

  // hangouts: coffee (upcoming), arcade (past with memories)
  const coffee = await prisma.hangout.create({
    data: {
      title: 'Coffee & Catch Up',
      description: 'Catching up over pour-over at Ember & Oak. Come hungry for pastries.',
      // Keep demo event safely in the future after deploys.
      startsAt: new Date(Date.now() + 3 * 24 * 3600_000),
      durationMin: 90,
      destinationId: placeRows[0].id,
      visibility: 'FRIENDS_ONLY',
      category: 'Cafe',
      maxParticipants: 6,
      hostId: maya.id,
      participants: {
        create: [
          { userId: maya.id, status: 'JOINED', attendance: 'ON_THE_WAY', sharing: 'LIVE', lastLat: 1.2881, lastLng: 103.8488 },
          { userId: users[1].id, status: 'JOINED', attendance: 'ON_THE_WAY', sharing: 'ETA_ONLY', lastLat: 1.2912, lastLng: 103.8499 },
          { userId: users[2].id, status: 'JOINED', attendance: 'NOT_STARTED', sharing: 'NONE' },
        ],
      },
    },
    include: { participants: true },
  });
  console.log(`hangout coffee: ${coffee.id}`);

  await prisma.vote.create({ data: { hangoutId: coffee.id, placeId: placeRows[0].id, userId: maya.id, weight: 1 } });

  await prisma.message.createMany({
    data: [
      { hangoutId: coffee.id, authorId: maya.id, body: 'See you at Ember & Oak! ☕' },
      { hangoutId: coffee.id, authorId: users[1].id, body: 'On my way, 12 min out 🚶' },
      { hangoutId: coffee.id, authorId: users[2].id, body: 'Same! Grab me a cold brew' },
    ],
  });

  const past = await prisma.hangout.create({
    data: {
      title: 'Neon Arcade Night',
      description: 'Sister night at the arcade. High score on Pinball or bust',
      startsAt: new Date(Date.now() - 2 * 24 * 3600_000),
      durationMin: 180,
      destinationId: placeRows[1].id,
      visibility: 'FRIENDS_ONLY',
      category: 'Gaming',
      hostId: users[1].id,
      participants: {
        create: [
          { userId: maya.id, status: 'JOINED', attendance: 'ARRIVED' },
          { userId: users[2].id, status: 'JOINED', attendance: 'ARRIVED' },
          { userId: users[3].id, status: 'JOINED', attendance: 'ARRIVED' },
        ],
      },
    },
  });

  await prisma.memory.createMany({
    data: [
      { hangoutId: past.id, authorId: maya.id, kind: 'PHOTO', url: '/img/arcade-photo-1.jpg', caption: 'Pinball champion 👑' },
      { hangoutId: past.id, authorId: users[1].id, kind: 'PHOTO', url: '/img/arcade-photo-2.jpg', caption: 'Team photo, we cleaned up' },
      { hangoutId: past.id, authorId: users[2].id, kind: 'PHOTO', url: '/img/arcade-photo-3.jpg' },
    ],
  });

  console.log('Done ✓');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());