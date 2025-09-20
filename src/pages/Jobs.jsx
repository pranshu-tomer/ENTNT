import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { ArrowLeft, Plus, Search, Archive, ArchiveRestore, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function Jobs() {
  const { jobId } = useParams();
  const [statusFilter, setStatusFilter] = useState('all');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    tags: '',
    status: 'active'
  });

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['jobs', search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        status: statusFilter === 'all' ? '' : statusFilter,
        page: page.toString(),
        pageSize: '12'
      });
      const response = await fetch(`/api/jobs?${params}`);
      return response.json();
    }
  });

  const createJobMutation = useMutation({
    mutationFn: async (jobData) => {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...jobData,
          slug: jobData.title?.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
          order: Date.now()
        })
      });
      if (!response.ok) throw new Error('Failed to create job');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setIsCreateModalOpen(false);
      setFormData({ title: '', tags: '', status: 'active' });
      toast.success('Job created successfully');
    },
    onError: () => {
      toast.error('Failed to create job');
    }
  });

  const updateJobMutation = useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const response = await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update job');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setEditingJob(null);
      setFormData({ title: '', tags: '', status: 'active' });
      toast.success('Job updated successfully');
    },
    onError: () => {
      toast.error('Failed to update job');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Job title is required');
      return;
    }

    const jobData = {
      title: formData.title,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      status: formData.status
    };

    if (editingJob) {
      updateJobMutation.mutate({ id: editingJob.id, ...jobData });
    } else {
      createJobMutation.mutate(jobData);
    }
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      tags: job.tags.join(', '),
      status: job.status
    });
  };

  const handleArchiveToggle = (job) => {
    updateJobMutation.mutate({
      id: job.id,
      status: job.status === 'active' ? 'archived' : 'active'
    });
  };

  useEffect(() => {
    if (editingJob) {
      setIsCreateModalOpen(true);
    }
  }, [editingJob]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Jobs Management</h1>
          </div>
          
          <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
            setIsCreateModalOpen(open);
            if (!open) {
              setEditingJob(null);
              setFormData({ title: '', tags: '', status: 'active' });
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Job
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingJob ? 'Edit Job' : 'Create New Job'}</DialogTitle>
                <DialogDescription>
                  {editingJob ? 'Update job details below.' : 'Fill in the details to create a new job posting.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Job Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Frontend Developer"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="e.g. Remote, Full-time, Senior"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => 
                      setFormData({ ...formData, status: value })
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="submit" disabled={createJobMutation.isPending || updateJobMutation.isPending}>
                    {editingJob ? 'Update Job' : 'Create Job'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Jobs Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobsData?.data?.map((job) => (
                <Card key={job.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <CardDescription className="text-sm text-gray-500">
                          {job.slug}
                        </CardDescription>
                      </div>
                      <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                        {job.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {job.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(job)}>
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleArchiveToggle(job)}
                      >
                        {job.status === 'active' ? (
                          <>
                            <Archive className="w-3 h-3 mr-1" />
                            Archive
                          </>
                        ) : (
                          <>
                            <ArchiveRestore className="w-3 h-3 mr-1" />
                            Restore
                          </>
                        )}
                      </Button>
                      <Link to={`/assessments/${job.id}`}>
                        <Button size="sm" variant="outline">
                          Assessment
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {jobsData?.total > jobsData?.pageSize && (
              <div className="flex justify-center mt-8">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-4">
                    Page {page} of {Math.ceil(jobsData.total / jobsData.pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= Math.ceil(jobsData.total / jobsData.pageSize)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}