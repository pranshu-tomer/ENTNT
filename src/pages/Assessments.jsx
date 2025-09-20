import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Trash2, Eye, Save } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

const questionTypes = [
  { value: 'single-choice', label: 'Single Choice' },
  { value: 'multi-choice', label: 'Multiple Choice' },
  { value: 'short-text', label: 'Short Text' },
  { value: 'long-text', label: 'Long Text' },
  { value: 'numeric', label: 'Numeric' },
  { value: 'file-upload', label: 'File Upload' }
];

export default function Assessments() {
  const { jobId } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('builder');
  const [assessment, setAssessment] = useState(null);
  const [formResponses, setFormResponses] = useState({});

  const { data: assessmentData, isLoading } = useQuery({
    queryKey: ['assessment', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const response = await fetch(`/api/assessments/${jobId}`);
      return response.json();
    },
    enabled: !!jobId
  });

  const saveAssessmentMutation = useMutation({
    mutationFn: async (assessmentData) => {
      const response = await fetch(`/api/assessments/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assessmentData)
      });
      if (!response.ok) throw new Error('Failed to save assessment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', jobId] });
      toast.success('Assessment saved successfully');
    },
    onError: () => {
      toast.error('Failed to save assessment');
    }
  });

  useEffect(() => {
    if (assessmentData) {
      setAssessment(assessmentData);
    } else if (jobId) {
      // Initialize empty assessment
      setAssessment({
        id: uuidv4(),
        jobId,
        title: 'New Assessment',
        sections: [{
          id: uuidv4(),
          title: 'General Questions',
          questions: []
        }],
        createdAt: new Date()
      });
    }
  }, [assessmentData, jobId]);

  const addSection = () => {
    if (!assessment) return;
    
    const newSection = {
      id: uuidv4(),
      title: 'New Section',
      questions: []
    };
    
    setAssessment({
      ...assessment,
      sections: [...assessment.sections, newSection]
    });
  };

  const updateSection = (sectionId, updates) => {
    if (!assessment) return;
    
    setAssessment({
      ...assessment,
      sections: assessment.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    });
  };

  const deleteSection = (sectionId) => {
    if (!assessment) return;
    
    setAssessment({
      ...assessment,
      sections: assessment.sections.filter(section => section.id !== sectionId)
    });
  };

  const addQuestion = (sectionId) => {
    if (!assessment) return;
    
    const newQuestion = {
      id: uuidv4(),
      type: 'short-text',
      question: 'New Question',
      required: false
    };
    
    setAssessment({
      ...assessment,
      sections: assessment.sections.map(section =>
        section.id === sectionId
          ? { ...section, questions: [...section.questions, newQuestion] }
          : section
      )
    });
  };

  const updateQuestion = (sectionId, questionId, updates) => {
    if (!assessment) return;
    
    setAssessment({
      ...assessment,
      sections: assessment.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.map(question =>
                question.id === questionId ? { ...question, ...updates } : question
              )
            }
          : section
      )
    });
  };

  const deleteQuestion = (sectionId, questionId) => {
    if (!assessment) return;
    
    setAssessment({
      ...assessment,
      sections: assessment.sections.map(section =>
        section.id === sectionId
          ? { ...section, questions: section.questions.filter(q => q.id !== questionId) }
          : section
      )
    });
  };

  const handleSave = () => {
    if (assessment) {
      saveAssessmentMutation.mutate(assessment);
    }
  };

  const renderQuestionPreview = (question) => {
    const value = formResponses[question.id];
    
    switch (question.type) {
      case 'single-choice':
        return (
          <RadioGroup
            value={typeof value === 'string' ? value : ''}
            onValueChange={(val) => setFormResponses({ ...formResponses, [question.id]: val })}
          >
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      
      case 'multi-choice':
        return (
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${index}`}
                  checked={Array.isArray(value) ? value.includes(option) : false}
                  onCheckedChange={(checked) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    const newValues = checked
                      ? [...currentValues, option]
                      : currentValues.filter((v) => v !== option);
                    setFormResponses({ ...formResponses, [question.id]: newValues });
                  }}
                />
                <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
              </div>
            ))}
          </div>
        );
      
      case 'short-text':
        return (
          <Input
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => setFormResponses({ ...formResponses, [question.id]: e.target.value })}
            placeholder="Enter your answer..."
            maxLength={question.validation?.maxLength}
          />
        );
      
      case 'long-text':
        return (
          <Textarea
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => setFormResponses({ ...formResponses, [question.id]: e.target.value })}
            placeholder="Enter your detailed answer..."
            maxLength={question.validation?.maxLength}
            rows={4}
          />
        );
      
      case 'numeric':
        return (
          <Input
            type="number"
            value={typeof value === 'number' ? value.toString() : ''}
            onChange={(e) => setFormResponses({ ...formResponses, [question.id]: parseFloat(e.target.value) || 0 })}
            placeholder="Enter a number..."
            min={question.validation?.min}
            max={question.validation?.max}
          />
        );
      
      case 'file-upload':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <p className="text-gray-500">Click to upload file or drag and drop</p>
            <p className="text-sm text-gray-400 mt-1">File upload functionality would be implemented here</p>
          </div>
        );
      
      default:
        return <div>Unknown question type</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading assessment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/jobs">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Jobs
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Assessment Builder</h1>
          </div>
          
          <Button onClick={handleSave} disabled={saveAssessmentMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Save Assessment
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="builder">Builder</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="builder" className="space-y-6">
            {assessment && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Assessment Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Assessment Title</Label>
                        <Input
                          id="title"
                          value={assessment.title}
                          onChange={(e) => setAssessment({ ...assessment, title: e.target.value })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {assessment.sections.map((section, sectionIndex) => (
                  <Card key={section.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <Input
                            value={section.title}
                            onChange={(e) => updateSection(section.id, { title: e.target.value })}
                            className="text-lg font-semibold"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSection(section.id)}
                          disabled={assessment.sections.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {section.questions.map((question, questionIndex) => (
                        <div key={question.id} className="border rounded-lg p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Question {questionIndex + 1}</h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteQuestion(section.id, question.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Question Type</Label>
                              <Select
                                value={question.type}
                                onValueChange={(value) => updateQuestion(section.id, question.id, { type: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {questionTypes.map(type => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center space-x-2 pt-6">
                              <Checkbox
                                id={`required-${question.id}`}
                                checked={question.required}
                                onCheckedChange={(checked) => 
                                  updateQuestion(section.id, question.id, { required: !!checked })
                                }
                              />
                              <Label htmlFor={`required-${question.id}`}>Required</Label>
                            </div>
                          </div>
                          
                          <div>
                            <Label>Question Text</Label>
                            <Textarea
                              value={question.question}
                              onChange={(e) => updateQuestion(section.id, question.id, { question: e.target.value })}
                              rows={2}
                            />
                          </div>
                          
                          {(question.type === 'single-choice' || question.type === 'multi-choice') && (
                            <div>
                              <Label>Options (one per line)</Label>
                              <Textarea
                                value={question.options?.join('\n') || ''}
                                onChange={(e) => updateQuestion(section.id, question.id, {
                                  options: e.target.value.split('\n').filter(Boolean)
                                })}
                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                                rows={3}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                      
                      <Button
                        variant="outline"
                        onClick={() => addQuestion(section.id)}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Question
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                
                <Button onClick={addSection} variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Section
                </Button>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="preview" className="space-y-6">
            {assessment && (
              <Card>
                <CardHeader>
                  <CardTitle>{assessment.title}</CardTitle>
                  <CardDescription>Preview of the assessment form</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {assessment.sections.map((section) => (
                    <div key={section.id} className="space-y-6">
                      <h3 className="text-xl font-semibold border-b pb-2">{section.title}</h3>
                      {section.questions.map((question) => (
                        <div key={question.id} className="space-y-2">
                          <Label className="text-base">
                            {question.question}
                            {question.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          {renderQuestionPreview(question)}
                        </div>
                      ))}
                    </div>
                  ))}
                  
                  <div className="pt-6 border-t">
                    <Button className="w-full">Submit Assessment</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}