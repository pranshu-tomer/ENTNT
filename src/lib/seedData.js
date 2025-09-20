import { v4 as uuidv4 } from 'uuid';

const jobTitles = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'DevOps Engineer',
  'Product Manager', 'UX Designer', 'Data Scientist', 'Mobile Developer',
  'QA Engineer', 'Technical Writer', 'Sales Manager', 'Marketing Specialist',
  'Customer Success Manager', 'Business Analyst', 'System Administrator',
  'Security Engineer', 'Cloud Architect', 'Machine Learning Engineer',
  'Project Manager', 'Scrum Master', 'UI Designer', 'Database Administrator',
  'Site Reliability Engineer', 'Solutions Architect', 'Technical Lead'
];

const tags = ['Remote', 'Full-time', 'Part-time', 'Contract', 'Senior', 'Junior', 'Mid-level', 'Urgent', 'New'];
const stages = ['applied', 'screen', 'tech', 'offer', 'hired', 'rejected'];

const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Chris', 'Jessica', 'Daniel', 'Ashley'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

export function generateJobs(count = 25) {
  const jobs = [];
  
  for (let i = 0; i < count; i++) {
    const title = jobTitles[Math.floor(Math.random() * jobTitles.length)];
    const slug = title.toLowerCase().replace(/\s+/g, '-') + '-' + i;
    const status = Math.random() > 0.3 ? 'active' : 'archived';
    const jobTags = tags.slice(0, Math.floor(Math.random() * 4) + 1);
    
    jobs.push({
      id: uuidv4(),
      title,
      slug,
      status,
      tags: jobTags,
      order: i,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    });
  }
  
  return jobs;
}

export function generateCandidates(jobs, count = 1000) {
  const candidates = [];

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`;
    const stage = stages[Math.floor(Math.random() * stages.length)];
    const jobId = jobs[Math.floor(Math.random() * jobs.length)].id;

    candidates.push({
      id: uuidv4(),
      name,
      email,
      stage,
      jobId,
      createdAt: new Date(
        Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000 // random date in last 20 days
      ),
    });
  }

  return candidates;
}


export function generateAssessments(jobs){
  const assessments = [];
  
  // Create assessments for first 3 jobs
  for (let i = 0; i < Math.min(3, jobs.length); i++) {
    const job = jobs[i];
    
    assessments.push({
      id: uuidv4(),
      jobId: job.id,
      title: `${job.title} Assessment`,
      sections: [
        {
          id: uuidv4(),
          title: 'Technical Skills',
          questions: [
            {
              id: uuidv4(),
              type: 'single-choice',
              question: 'What is your experience level with React?',
              required: true,
              options: ['Beginner', 'Intermediate', 'Advanced', 'Expert']
            },
            {
              id: uuidv4(),
              type: 'multi-choice',
              question: 'Which technologies have you worked with?',
              required: true,
              options: ['JavaScript', 'TypeScript', 'Node.js', 'Python', 'Java', 'C#']
            },
            {
              id: uuidv4(),
              type: 'short-text',
              question: 'Years of experience in software development?',
              required: true,
              validation: { maxLength: 50 }
            },
            {
              id: uuidv4(),
              type: 'long-text',
              question: 'Describe your most challenging project.',
              required: false,
              validation: { maxLength: 1000 }
            },
            {
              id: uuidv4(),
              type: 'numeric',
              question: 'Rate your JavaScript skills (1-10)',
              required: true,
              validation: { min: 1, max: 10 }
            }
          ]
        },
        {
          id: uuidv4(),
          title: 'General Questions',
          questions: [
            {
              id: uuidv4(),
              type: 'single-choice',
              question: 'Are you available for remote work?',
              required: true,
              options: ['Yes', 'No', 'Hybrid preferred']
            },
            {
              id: uuidv4(),
              type: 'short-text',
              question: 'Expected salary range?',
              required: false,
              validation: { maxLength: 100 }
            },
            {
              id: uuidv4(),
              type: 'file-upload',
              question: 'Upload your portfolio or resume',
              required: false
            }
          ]
        }
      ],
      createdAt: new Date()
    });
  }
  
  return assessments;
}

export function generateTimeline(candidates){
  const timeline = [];
  
  candidates.forEach(candidate => {
    // Generate 1-3 timeline entries per candidate
    const entryCount = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < entryCount; i++) {
      timeline.push({
        id: uuidv4(),
        candidateId: candidate.id,
        stage: i === entryCount - 1 ? candidate.stage : stages[Math.floor(Math.random() * stages.length)],
        timestamp: new Date(candidate.createdAt.getTime() + i * 24 * 60 * 60 * 1000),
        notes: i === 0 ? 'Application submitted' : `Moved to ${candidate.stage} stage`
      });
    }
  });
  
  return timeline;
}