import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Worked out from the roll number.
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    rollNumber: { type: String, required: true, uppercase: true, trim: true },
    isLeader: { type: Boolean, default: false },
  },
  { _id: false },
);

const teamSchema = new mongoose.Schema(
  {
    teamName: { type: String, required: true, trim: true },
    teamCode: { type: String, required: true, unique: true },
    members: { type: [memberSchema], required: true },
    emailStatus: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  },
  { timestamps: true, versionKey: false },
);

// A roll number or email can only be on one team.
teamSchema.index({ 'members.rollNumber': 1 }, { unique: true });
teamSchema.index({ 'members.email': 1 }, { unique: true });

export const Team = mongoose.model('Team', teamSchema);
