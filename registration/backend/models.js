import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
  {
    teamName: { type: String, required: true, trim: true },
    registrationType: { type: String, enum: ['online', 'onsite'], required: true },
    startedAt: { type: Date, default: null },
    activeUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sessionToken: { type: String, default: null, index: true },
  },
  { timestamps: true },
);

const userSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    registrationType: { type: String, enum: ['online', 'onsite'], required: true },
  },
  { timestamps: true },
);

export const Team = mongoose.model('Team', teamSchema);
export const User = mongoose.model('User', userSchema);
