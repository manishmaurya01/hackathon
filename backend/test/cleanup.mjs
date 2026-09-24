// One-off: remove throwaway accounts created by the test suites, keeping demo accounts.
import mongoose from 'mongoose';
import env from '../src/config/env.js';

await mongoose.connect(env.MONGODB_URI);
const users = mongoose.connection.collection('users');
const reports = mongoose.connection.collection('reports');

const throwaway = /^(t|o|e2e|routes|other)\d+@veriwrite\.test$/;
const doomed = (await users.find({ email: throwaway }).toArray()).map((u) => u._id);

const delReports = await reports.deleteMany({ userId: { $in: doomed } });
const delUsers = await users.deleteMany({ _id: { $in: doomed } });

const remaining = await users.find({}).toArray();
console.log(`removed ${delUsers.deletedCount} users, ${delReports.deletedCount} reports`);
console.log(
  'remaining accounts:',
  remaining.map((u) => u.email).join(', ') || '(none)'
);
console.log('remaining reports:', await reports.countDocuments());

await mongoose.disconnect();
