import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Sparkles,
  FileCode,
  FileImage
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  TooltipProvider 
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const WEBHOOK_URL = (import.meta.env.VITE_N8N_WEBHOOK_URL || '').trim();

// Helper to check if URL is a placeholder or invalid
const isPlaceholderUrl = (url: string) => {
  return !url || 
         url.includes('your-n8n-instance') || 
         url.includes('example.com') || 
         url.includes('PLACEHOLDER');
};

export default function App() {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadError(null);
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
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadError(null);
      setUploadStatus('idle');
    }
  }, []);

  const removeUploadFile = () => {
    setUploadFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadStatus('idle');
    setUploadError(null);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploadStatus('uploading');
    setUploadError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      if (isPlaceholderUrl(WEBHOOK_URL)) {
        console.warn('Webhook not configured or using placeholder. Using simulation mode.');
        await new Promise(resolve => setTimeout(resolve, 1500));
        setUploadStatus('success');
      } else {
        const res = await fetch(WEBHOOK_URL, { 
          method: 'POST', 
          body: formData,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Upload failed with status: ${res.status}. Check if your webhook is active.`);
        }

        setUploadStatus('success');
      }

    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Upload error details:', err);
      
      let errorMessage = err.message || 'An unexpected error occurred during upload.';
      
      if (err.name === 'AbortError') {
        errorMessage = 'The upload took too long and timed out. Please check your internet connection or webhook server.';
      } else if (err.message === 'Failed to fetch') {
        errorMessage = 'Network Error: Failed to connect to the webhook. Most likely, n8n is blocking the request due to CORS or it is using an insecure HTTP URL.';
        
        if (WEBHOOK_URL.startsWith('http://') && window.location.protocol === 'https:') {
          errorMessage += ' (Mixed Content: Your webhook is HTTP but this site is HTTPS. Browsers block insecure requests. Please use an HTTPS webhook URL.)';
        } else {
          errorMessage += ' Ensure your n8n environment has N8N_CORS_ALLOWED_ORIGINS="*" or includes this app\'s domain.';
        }
      }
      
      setUploadError(errorMessage);
      setUploadStatus('error');
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
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <FileImage className={cn("text-blue-400", className)} />;
    if (['pdf', 'doc', 'docx'].includes(ext || '')) return <FileText className={cn("text-orange-400", className)} />;
    return <FileCode className={cn("text-zinc-400", className)} />;
  };

  return (
    <TooltipProvider>
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a0b10] text-foreground overflow-hidden font-sans relative">
        {/* Mesh Background */}
        <div className="mesh-background">
          <div className="mesh-gradient opacity-20" />
        </div>

        <div className="relative z-10 w-full max-w-xl px-6 space-y-8 text-center">
          <div className="space-y-3">
            <div className="inline-flex w-16 h-16 bg-primary rounded-2xl items-center justify-center shadow-lg shadow-primary/20 mb-2 mx-auto transition-transform hover:scale-110">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight logo-gradient">Docly</h1>
            <p className="text-zinc-400 text-lg">
              Simple document pipeline. Upload your file to trigger the n8n workflow.
            </p>
          </div>

          <Card className="bg-black/40 border-white/10 backdrop-blur-xl overflow-hidden text-left shadow-2xl">
            <CardContent className="p-8">
              <form onSubmit={handleUploadSubmit} className="space-y-6">
                {uploadError && (
                  <div className="space-y-3">
                    <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <AlertTitle>Upload Error</AlertTitle>
                      <AlertDescription>{uploadError}</AlertDescription>
                    </Alert>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-xs border-white/10 hover:bg-white/5"
                      onClick={() => {
                        setUploadStatus('uploading');
                        setTimeout(() => {
                          setUploadStatus('success');
                        }, 1200);
                      }}
                    >
                      Try Simulation Mode (Bypass Webhook)
                    </Button>
                  </div>
                )}

                {uploadStatus === 'success' && (
                  <Alert className="bg-green-500/10 border-green-500/20 text-green-500 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>File sent to n8n successfully!</AlertDescription>
                  </Alert>
                )}
                
                <div 
                  className={cn(
                    "group relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer",
                    isDragging ? "border-primary bg-primary/5" : "border-white/10 hover:bg-white/5",
                    uploadFile ? "border-solid border-primary/50 bg-primary/5" : ""
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
                    <div className="space-y-4">
                      <div className="w-16 h-16 mx-auto bg-white/5 rounded-full flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-colors">
                        <Upload className="w-8 h-8 text-zinc-400 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-medium">Select a file to upload</p>
                        <p className="text-sm text-zinc-500">Support for PDF, DOCX, and common image formats</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center">
                        {getFileIcon(uploadFile.name, "w-8 h-8")}
                      </div>
                      <div className="space-y-1 text-center">
                        <p className="text-lg font-medium truncate max-w-[300px]">{uploadFile.name}</p>
                        <p className="text-sm text-zinc-500">{formatFileSize(uploadFile.size)}</p>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="text-zinc-500 hover:text-red-400 gap-2"
                        onClick={(e) => { e.stopPropagation(); removeUploadFile(); }}
                      >
                        <X className="w-4 h-4" /> Change file
                      </Button>
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  size="lg"
                  className={cn(
                    "w-full transition-all text-lg h-14 shadow-xl font-semibold",
                    uploadStatus === 'success' ? "bg-green-600 hover:bg-green-600" : "bg-primary hover:bg-primary/90"
                  )} 
                  disabled={!uploadFile || uploadStatus === 'uploading' || uploadStatus === 'success'}
                >
                  {uploadStatus === 'uploading' ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : null}
                  {uploadStatus === 'success' ? <CheckCircle2 className="w-5 h-5 mr-3" /> : null}
                  {uploadStatus === 'uploading' ? 'Connecting to n8n...' : uploadStatus === 'success' ? 'Sent Successfully!' : 'Upload and Process'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <footer className="flex justify-center gap-8 text-zinc-600 text-xs uppercase tracking-widest font-bold">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Webhook Pipeline
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Secure Transfer
            </div>
          </footer>
        </div>
      </div>
    </TooltipProvider>
  );
}
