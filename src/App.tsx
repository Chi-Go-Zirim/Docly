import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  User,
  Mail,
  FileType,
  ArrowRight,
  Sparkles,
  FileCode,
  FileImage,
  Plus,
  MessageSquare,
  Search,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  MoreVertical,
  Trash2,
  ExternalLink,
  BookOpen,
  History,
  LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from '@/components/ui/resizable';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { GoogleGenAI } from "@google/genai";

const WEBHOOK_URL = 'YOUR_N8N_WEBHOOK_URL_HERE';

let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined. Please set it in your environment variables.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface Source {
  id: string;
  name: string;
  size: number;
  type: string;
  docType: string;
  uploadedAt: Date;
  summary?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function App() {
  const [sources, setSources] = useState<Source[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadEmail, setUploadEmail] = useState('');
  const [uploadDocType, setUploadDocType] = useState('research_paper');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeSource = sources.find(s => s.id === activeSourceId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
      setUploadStatus('idle');
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadFile(e.dataTransfer.files[0]);
      setUploadStatus('idle');
    }
  }, []);

  const removeUploadFile = () => {
    setUploadFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploadStatus('uploading');

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('name', uploadName);
    formData.append('email', uploadEmail);
    formData.append('document_type', uploadDocType);

    try {
      // Simulate webhook call
      // const res = await fetch(WEBHOOK_URL, { method: 'POST', body: formData });
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newSource: Source = {
        id: Math.random().toString(36).substring(7),
        name: uploadFile.name,
        size: uploadFile.size,
        type: uploadFile.type,
        docType: uploadDocType,
        uploadedAt: new Date(),
        summary: `This is a simulated summary for ${uploadFile.name}. In a real app, this would come from the n8n webhook processing.`
      };

      setSources(prev => [newSource, ...prev]);
      setActiveSourceId(newSource.id);
      setUploadStatus('success');
      
      setTimeout(() => {
        setIsUploadOpen(false);
        setUploadStatus('idle');
        setUploadFile(null);
        setUploadName('');
        setUploadEmail('');
      }, 1000);

    } catch (err) {
      console.error(err);
      setUploadStatus('error');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isChatLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsChatLoading(true);

    try {
      const prompt = `
        Context: You are an AI assistant helping a user analyze a document called "${activeSource?.name || 'Unknown'}".
        The document type is ${activeSource?.docType || 'General'}.
        
        User Question: ${inputMessage}
        
        Please provide a helpful, concise answer based on the context of being a document assistant.
      `;

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || "I'm sorry, I couldn't process that request.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Error: Failed to connect to AI service. Please check your API key.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string, className?: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <FileImage className={cn("w-5 h-5 text-blue-400", className)} />;
    if (['pdf', 'doc', 'docx'].includes(ext || '')) return <FileText className={cn("w-5 h-5 text-orange-400", className)} />;
    return <FileCode className={cn("w-5 h-5 text-zinc-400", className)} />;
  };

  return (
    <TooltipProvider>
      <div className="h-screen w-screen flex bg-[#0a0b10] text-foreground overflow-hidden font-sans">
        {/* Mesh Background */}
        <div className="mesh-background">
          <div className="mesh-gradient opacity-20" />
        </div>

        {/* Sidebar */}
        <motion.aside 
          initial={false}
          animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
          className="border-r border-white/5 bg-black/40 backdrop-blur-xl flex flex-col overflow-hidden relative z-20"
        >
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight logo-gradient">Docly</span>
            </div>
          </div>

          <div className="px-4 mb-4">
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 justify-start gap-2 h-11">
                  <Plus className="w-4 h-4" /> Add Source
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0a0b10] border-white/10 text-foreground max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Upload Document</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Add a new document to your workspace for analysis.
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleUploadSubmit} className="space-y-6 py-4">
                  <div 
                    className={cn(
                      "relative border-2 border-dashed rounded-xl p-8 text-center transition-all",
                      isDragging ? "border-primary bg-primary/5" : "border-white/10 hover:bg-white/5",
                      uploadFile ? "border-solid border-primary/50" : ""
                    )}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => !uploadFile && fileInputRef.current?.click()}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {!uploadFile ? (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 mx-auto text-zinc-500" />
                        <p className="text-sm font-medium">Click or drag to upload</p>
                        <p className="text-xs text-zinc-500">PDF, DOCX, Images</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getFileIcon(uploadFile.name)}
                          <div className="text-left">
                            <p className="text-sm font-medium truncate max-w-[200px]">{uploadFile.name}</p>
                            <p className="text-xs text-zinc-500">{formatFileSize(uploadFile.size)}</p>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeUploadFile(); }}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-zinc-500">Name</Label>
                      <Input value={uploadName} onChange={e => setUploadName(e.target.value)} className="bg-white/5 border-white/10" placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-zinc-500">Doc Type</Label>
                      <Select value={uploadDocType} onValueChange={setUploadDocType}>
                        <SelectTrigger className="bg-white/5 border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10">
                          <SelectItem value="research_paper">Research Paper</SelectItem>
                          <SelectItem value="invoice">Invoice</SelectItem>
                          <SelectItem value="legal">Legal</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={!uploadFile || uploadStatus === 'uploading'}>
                    {uploadStatus === 'uploading' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload & Process'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <ScrollArea className="flex-1 px-2">
            <div className="space-y-1">
              <div className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.1em]">Sources</div>
              {sources.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-zinc-600 italic">No sources added yet.</p>
                </div>
              ) : (
                sources.map(source => (
                  <button
                    key={source.id}
                    onClick={() => setActiveSourceId(source.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all group text-left",
                      activeSourceId === source.id ? "bg-primary/10 text-primary" : "hover:bg-white/5 text-zinc-400"
                    )}
                  >
                    {getFileIcon(source.name, activeSourceId === source.id ? "text-primary" : "")}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{source.name}</p>
                      <p className="text-[10px] opacity-50">{formatFileSize(source.size)}</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-white/5 space-y-2">
            <Button variant="ghost" className="w-full justify-start gap-3 text-zinc-400 hover:text-zinc-200">
              <History className="w-4 h-4" /> History
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 text-zinc-400 hover:text-zinc-200">
              <Settings className="w-4 h-4" /> Settings
            </Button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 relative z-10">
          {/* Header */}
          <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-black/20 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-zinc-400"
              >
                {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
              </Button>
              <Separator orientation="vertical" className="h-6 bg-white/10" />
              <div className="flex items-center gap-2 overflow-hidden">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 shrink-0">
                  Workspace
                </Badge>
                <h2 className="text-sm font-medium text-zinc-300 truncate">
                  {activeSource ? activeSource.name : 'Select a source to begin'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input className="bg-white/5 border-white/10 pl-9 w-64 h-9 text-sm" placeholder="Search in documents..." />
              </div>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                Share
              </Button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-orange-500 border border-white/20" />
            </div>
          </header>

          {/* Workspace Area */}
          <div className="flex-1 overflow-hidden">
            {!activeSourceId ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10">
                  <BookOpen className="w-10 h-10 text-zinc-600" />
                </div>
                <div className="max-w-md space-y-2">
                  <h3 className="text-2xl font-bold">Welcome to your Docly Workspace</h3>
                  <p className="text-zinc-500">
                    Upload a document or select an existing source from the sidebar to start analyzing and chatting with your data.
                  </p>
                </div>
                <Button onClick={() => setIsUploadOpen(true)} size="lg" className="gap-2">
                  <Plus className="w-5 h-5" /> Add your first source
                </Button>
              </div>
            ) : (
              <ResizablePanelGroup direction="horizontal" className="h-full">
                {/* Left Panel: Document Info/Preview */}
                <ResizablePanel defaultSize={50} minSize={30}>
                  <div className="h-full flex flex-col bg-black/20">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-400" />
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Source Preview</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <ScrollArea className="flex-1 p-8">
                      <div className="max-w-2xl mx-auto space-y-8">
                        <div className="space-y-4">
                          <Badge className="bg-primary/10 text-primary border-primary/20">Summary</Badge>
                          <h1 className="text-3xl font-bold leading-tight">{activeSource?.name}</h1>
                          <p className="text-zinc-400 leading-relaxed text-lg">
                            {activeSource?.summary}
                          </p>
                        </div>
                        
                        <Separator className="bg-white/5" />
                        
                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Type</p>
                            <p className="text-sm font-medium">{activeSource?.docType.replace('_', ' ')}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Size</p>
                            <p className="text-sm font-medium">{formatFileSize(activeSource?.size || 0)}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Uploaded</p>
                            <p className="text-sm font-medium">{activeSource?.uploadedAt.toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Key Insights</p>
                          <div className="grid grid-cols-1 gap-3">
                            {[
                              "Main methodology involves comparative analysis.",
                              "Significant performance improvements noted in section 4.",
                              "Future work suggests expanding the dataset."
                            ].map((insight, i) => (
                              <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
                                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                  <Sparkles className="w-3 h-3 text-primary" />
                                </div>
                                <p className="text-sm text-zinc-300">{insight}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Suggested Questions</p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              "What are the key findings?",
                              "Summarize the conclusion",
                              "Explain the methodology",
                              "What data was used?"
                            ].map((q, i) => (
                              <Button 
                                key={i} 
                                variant="outline" 
                                size="sm" 
                                className="rounded-full bg-white/5 border-white/10 hover:bg-primary/10 hover:border-primary/30 text-xs"
                                onClick={() => setInputMessage(q)}
                              >
                                {q}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="p-12 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                          <LayoutDashboard className="w-12 h-12 text-zinc-700" />
                          <p className="text-sm text-zinc-600">Full document viewer coming soon</p>
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                </ResizablePanel>

                <ResizableHandle className="w-1 bg-white/5 hover:bg-primary/50 transition-colors" />

                {/* Right Panel: Chat Interface */}
                <ResizablePanel defaultSize={50} minSize={30}>
                  <div className="h-full flex flex-col bg-black/40 backdrop-blur-sm">
                    <div className="p-4 border-b border-white/5 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Chat with Document</span>
                    </div>

                    <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                      <div className="space-y-6 max-w-3xl mx-auto">
                        {messages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                              <MessageSquare className="w-6 h-6 text-primary" />
                            </div>
                            <div className="space-y-1">
                              <p className="font-medium text-zinc-300">Ask anything about this document</p>
                              <p className="text-xs text-zinc-500">Summarize, extract key points, or ask specific questions.</p>
                            </div>
                          </div>
                        ) : (
                          messages.map(msg => (
                            <motion.div 
                              key={msg.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={cn(
                                "flex gap-4",
                                msg.role === 'user' ? "flex-row-reverse" : ""
                              )}
                            >
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                msg.role === 'user' ? "bg-zinc-800" : "bg-primary/20"
                              )}>
                                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-primary" />}
                              </div>
                              <div className={cn(
                                "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed",
                                msg.role === 'user' ? "bg-zinc-800/50 text-zinc-200 rounded-tr-none" : "bg-white/5 text-zinc-300 rounded-tl-none border border-white/5"
                              )}>
                                {msg.content}
                              </div>
                            </motion.div>
                          ))
                        )}
                        {isChatLoading && (
                          <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/5">
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    <div className="p-6 border-t border-white/5">
                      <form onSubmit={handleSendMessage} className="relative max-w-3xl mx-auto">
                        <Input 
                          value={inputMessage}
                          onChange={e => setInputMessage(e.target.value)}
                          placeholder="Ask a question..."
                          className="w-full h-14 bg-white/5 border-white/10 pl-6 pr-16 rounded-2xl focus:ring-primary/50"
                        />
                        <Button 
                          type="submit" 
                          size="icon" 
                          disabled={!inputMessage.trim() || isChatLoading}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-primary hover:bg-primary/90"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </form>
                      <p className="text-[10px] text-center text-zinc-600 mt-4">
                        Docly can make mistakes. Check important info.
                      </p>
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
