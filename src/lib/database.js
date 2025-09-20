import Dexie from "dexie";

export class TalentFlowDB extends Dexie {
  constructor() {
    super("TalentFlowDB");

    this.version(1).stores({
      jobs: "id, title, status, order, createdAt",
      candidates: "id, name, email, stage, jobId, createdAt",
      assessments: "id, jobId, createdAt",
      timeline: "id, candidateId, timestamp",
    });

    // Define tables (no TS typing in JS)
    this.jobs = this.table("jobs");
    this.candidates = this.table("candidates");
    this.assessments = this.table("assessments");
    this.timeline = this.table("timeline");
  }
}

export const db = new TalentFlowDB();
