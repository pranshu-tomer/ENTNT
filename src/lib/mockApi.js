import { http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';
import { generateJobs, generateCandidates, generateAssessments, generateTimeline } from './seedData';
import {db} from './database'

// Initialize database with seed data
async function initializeDatabase() {
  const jobCount = await db.jobs.count();
  
  if (jobCount === 0) {
    console.log('Seeding database...');
    
    const jobs = generateJobs(25);
    const candidates = generateCandidates(jobs, 1000);
    const assessments = generateAssessments(jobs);
    const timeline = generateTimeline(candidates);
    
    await db.jobs.bulkAdd(jobs);
    await db.candidates.bulkAdd(candidates);
    await db.assessments.bulkAdd(assessments);
    await db.timeline.bulkAdd(timeline);
    
    console.log('Database seeded successfully');
  }
}

// Simulate network delay and occasional errors
const simulateNetworkDelay = () => {
  return new Promise(resolve => {
    const delay = Math.random() * 1000 + 200; // 200-1200ms
    setTimeout(resolve, delay);
  });
};

const simulateError = () => {
  if (Math.random() < 0.08) { // 8% error rate
    throw new Error('Simulated network error');
  }
};

export const worker = setupWorker(
  // Jobs endpoints
  http.get('/api/jobs', async ({ request }) => {
    await simulateNetworkDelay();
    
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const sort = url.searchParams.get('sort') || 'order';
    
    let query = db.jobs.orderBy(sort);
    
    if (status) {
      query = query.filter(job => job.status === status);
    }
    
    const jobs = await query.toArray();
    
    const filteredJobs = search 
      ? jobs.filter(job => 
          job.title.toLowerCase().includes(search.toLowerCase()) ||
          job.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
        )
      : jobs;
    
    const startIndex = (page - 1) * pageSize;
    const paginatedJobs = filteredJobs.slice(startIndex, startIndex + pageSize);
    
    return HttpResponse.json({
      data: paginatedJobs,
      total: filteredJobs.length,
      page,
      pageSize
    });
  }),

  http.post('/api/jobs', async ({ request }) => {
    await simulateNetworkDelay();
    simulateError();
    
    const jobData = await request.json();
    const newJob = {
      id: crypto.randomUUID(),
      title: jobData.title || '',
      slug: jobData.slug || '',
      status: jobData.status || 'active',
      tags: jobData.tags || [],
      order: jobData.order || 0,
      createdAt: new Date()
    };
    
    await db.jobs.add(newJob);
    return HttpResponse.json(newJob);
  }),

  http.patch('/api/jobs/:id', async ({ request, params }) => {
    await simulateNetworkDelay();
    simulateError();
    
    const { id } = params;
    const updates = await request.json();
    
    await db.jobs.update(id, updates);
    const updatedJob = await db.jobs.get(id);
    
    return HttpResponse.json(updatedJob);
  }),

  // Candidates endpoints
  http.get('/api/candidates', async ({ request }) => {
    await simulateNetworkDelay();
    
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const stage = url.searchParams.get('stage') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
    
    let query = db.candidates.orderBy('createdAt').reverse();
    
    if (stage) {
      query = query.filter(candidate => candidate.stage === stage);
    }
    
    const candidates = await query.toArray();
    
    const filteredCandidates = search 
      ? candidates.filter(candidate => 
          candidate.name.toLowerCase().includes(search.toLowerCase()) ||
          candidate.email.toLowerCase().includes(search.toLowerCase())
        )
      : candidates;
    
    const startIndex = (page - 1) * pageSize;
    const paginatedCandidates = filteredCandidates.slice(startIndex, startIndex + pageSize);
    
    return HttpResponse.json({
      data: paginatedCandidates,
      total: filteredCandidates.length,
      page,
      pageSize
    });
  }),

  http.patch('/api/candidates/:id', async ({ request, params }) => {
    await simulateNetworkDelay();
    simulateError();
    
    const { id } = params;
    const updates = await request.json();
    
    await db.candidates.update(id, updates);
    const updatedCandidate = await db.candidates.get(id);
    
    // Add timeline entry for stage changes
    if (updates.stage) {
      await db.timeline.add({
        id: crypto.randomUUID(),
        candidateId: id,
        stage: updates.stage,
        timestamp: new Date(),
        notes: `Moved to ${updates.stage} stage`
      });
    }
    
    return HttpResponse.json(updatedCandidate);
  }),

  http.get('/api/candidates/:id/timeline', async ({ params }) => {
    await simulateNetworkDelay();
    
    const { id } = params;
    const timeline = await db.timeline
      .where('candidateId')
      .equals(id)
      .sortBy('timestamp')
      // .toArray();
    
    return HttpResponse.json(timeline);
  }),

  // Assessments endpoints
  http.get('/api/assessments/:jobId', async ({ params }) => {
    await simulateNetworkDelay();
    
    const { jobId } = params;
    const assessment = await db.assessments
      .where('jobId')
      .equals(jobId)
      .first();
    
    return HttpResponse.json(assessment);
  }),

  http.put('/api/assessments/:jobId', async ({ request, params }) => {
    await simulateNetworkDelay();
    simulateError();
    
    const { jobId } = params;
    const assessmentData = await request.json();
    
    const existingAssessment = await db.assessments
      .where('jobId')
      .equals(jobId)
      .first();
    
    if (existingAssessment) {
      await db.assessments.update(existingAssessment.id, assessmentData);
    } else {
      await db.assessments.add({
        ...assessmentData,
        id: crypto.randomUUID(),
        jobId: jobId,
        createdAt: new Date()
      });
    }
    
    return HttpResponse.json(assessmentData);
  })
);

// Initialize MSW and database
export async function startMockApi() {
  await initializeDatabase();
  
  if (typeof window !== 'undefined') {
    await worker.start({
      onUnhandledRequest: 'bypass'
    });
    console.log('Mock API started');
  }
}