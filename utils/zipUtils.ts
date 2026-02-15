import JSZip from 'jszip';
import saveAs from 'file-saver';
import { GeneratedFile } from '../types';

export const downloadProjectZip = async (projectName: string, files: GeneratedFile[]) => {
  const zip = new JSZip();

  files.forEach((file) => {
    // Remove leading slash if present to avoid empty root folder issues
    const path = file.path.startsWith('/') ? file.path.slice(1) : file.path;
    zip.file(path, file.content);
  });

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${projectName}-blueprint.zip`);
};

export const readProjectZip = async (file: File): Promise<{ files: GeneratedFile[]; guessedName: string }> => {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  const files: GeneratedFile[] = [];
  
  // Try to guess project name from the root folder if possible, otherwise filename
  let guessedName = file.name.replace('.zip', '');

  for (const [relativePath, zipEntry] of Object.entries(loadedZip.files)) {
    const entry = zipEntry as any;

    if (entry.dir) continue;
    
    // Filter out binary/unwanted files
    if (relativePath.includes('node_modules') || 
        relativePath.includes('.git') || 
        relativePath.includes('dist') || 
        relativePath.includes('build') ||
        relativePath.includes('__pycache__') ||
        relativePath.includes('.DS_Store')) continue;
    
    // Check extension for text files
    const validExtensions = ['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.json', '.py', '.md', '.txt', '.cpp', '.c', '.h', '.hpp', '.ino', '.ini', '.java', '.dart', '.go', '.rs', '.php', '.vue', '.svelte'];
    const ext = '.' + relativePath.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(ext) && !relativePath.endsWith('Makefile') && !relativePath.endsWith('Dockerfile') && !relativePath.endsWith('.env.example')) {
        continue;
    }

    try {
      const content = await entry.async('string');
      files.push({
        path: relativePath,
        content: content,
        language: getLanguageFromExt(ext)
      });
    } catch (e) {
      console.warn(`Skipping binary or unreadable file: ${relativePath}`);
    }
  }
  
  return { files, guessedName };
};

const getLanguageFromExt = (ext: string): string => {
    if (ext === '.ts' || ext === '.tsx') return 'typescript';
    if (ext === '.js' || ext === '.jsx') return 'javascript';
    if (ext === '.py') return 'python';
    if (ext === '.css') return 'css';
    if (ext === '.json') return 'json';
    if (ext === '.html') return 'html';
    if (['.cpp', '.c', '.h', '.hpp', '.ino'].includes(ext)) return 'cpp';
    if (ext === '.ini') return 'ini';
    return 'plaintext';
};