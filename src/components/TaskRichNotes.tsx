import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Minus, 
  Link2, 
  FileText, 
  Save, 
  Check, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Download, 
  Trash2, 
  Sparkles, 
  ChevronDown, 
  Undo2, 
  Redo2, 
  RemoveFormatting,
  AlertCircle,
  Lightbulb,
  CheckCircle,
  Calendar,
  Clock,
  Printer
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface TaskRichNotesProps {
  initialNotes?: string;
  notesUpdatedAt?: string;
  taskTitle: string;
  onSave: (notesHtml: string) => void;
  className?: string;
}

const TEMPLATES = [
  {
    id: 'meeting',
    title: 'Meeting Minutes',
    description: 'Attendees, agenda, discussion notes, decisions, and action items',
    icon: Calendar,
    getHtml: (title: string) => `
      <h1>📅 Meeting Minutes: ${title || 'Project Sync'}</h1>
      <p><strong>Date & Time:</strong> ${format(new Date(), 'EEEE, MMMM d, yyyy • h:mm a')} | <strong>Location:</strong> Main Conference / Virtual</p>
      <hr />
      <h3>👥 Attendees & Stakeholders</h3>
      <ul>
        <li><strong>Lead / Organizer:</strong> Team Lead</li>
        <li><strong>Attendees:</strong> Product, Engineering, Design</li>
        <li><strong>Absent:</strong> None</li>
      </ul>
      
      <h3>🎯 Meeting Objectives & Agenda</h3>
      <ol>
        <li>Review current progress and project blockers</li>
        <li>Finalize architecture decisions and requirements</li>
        <li>Assign action items and milestone deliverables</li>
      </ol>
      
      <h3>📝 Key Discussion & Notes</h3>
      <p>Discussed project scope, dependencies, and delivery timeline. The team reviewed technical options and agreed on the primary approach.</p>
      
      <div class="note-callout note-callout-info">
        <strong>💡 Key Decision:</strong> We agreed to proceed with the proposed implementation strategy to prioritize stability and speed to market.
      </div>
      
      <h3>✅ Action Items & Deliverables</h3>
      <ul>
        <li>[ ] <strong>@Lead:</strong> Finalize detailed project documentation and schedule follow-up</li>
        <li>[ ] <strong>@Engineering:</strong> Implement core functionality and write unit tests</li>
        <li>[ ] <strong>@Design:</strong> Deliver final UI assets and review user experience flow</li>
      </ul>
      
      <h3>⏭️ Next Meeting & Milestones</h3>
      <p>Next synchronization scheduled for next week to review completed deliverables.</p>
    `.trim(),
  },
  {
    id: 'project-draft',
    title: 'Project Specification / Draft',
    description: 'Executive summary, objectives, scope, architecture, and timeline',
    icon: FileText,
    getHtml: (title: string) => `
      <h1>🚀 Project Specification: ${title || 'New Initiative'}</h1>
      <p><em>Created on ${format(new Date(), 'MMMM d, yyyy')}</em></p>
      <hr />
      
      <h3>1. Executive Summary</h3>
      <p>This initiative focuses on delivering a reliable and performant solution to improve workflow efficiency and enhance the end-user experience.</p>
      
      <h3>2. Core Objectives & Success Metrics</h3>
      <ul>
        <li><strong>Primary Goal:</strong> Streamline task completion and reduce operational friction.</li>
        <li><strong>Target Metric:</strong> Achieve a 40% reduction in turnaround time for routine deliverables.</li>
        <li><strong>Quality Standard:</strong> Zero critical bugs and positive stakeholder satisfaction scores.</li>
      </ul>
      
      <h3>3. Scope & Requirements</h3>
      <p><strong>In Scope:</strong></p>
      <ul>
        <li>Core feature workflow and responsive user interface</li>
        <li>Offline persistence and secure cloud synchronization</li>
        <li>Comprehensive error handling and feedback indicators</li>
      </ul>
      <p><strong>Out of Scope:</strong></p>
      <ul>
        <li>Third-party external service connectors for initial release</li>
      </ul>
      
      <div class="note-callout note-callout-warning">
        <strong>⚠️ Key Constraint:</strong> Changes must maintain strict backwards compatibility with existing stored records.
      </div>
      
      <h3>4. Milestones & Timeline</h3>
      <ol>
        <li><strong>Phase 1:</strong> Architecture & interactive prototyping (Week 1)</li>
        <li><strong>Phase 2:</strong> Feature engineering and end-to-end testing (Week 2-3)</li>
        <li><strong>Phase 3:</strong> Final review, deployment, and rollout (Week 4)</li>
      </ol>
      
      <h3>5. Open Questions & Risks</h3>
      <ul>
        <li>Are there additional permissions or dependencies required from IT?</li>
        <li>How will performance be monitored post-launch?</li>
      </ul>
    `.trim(),
  },
  {
    id: 'brainstorming',
    title: 'Brainstorming & Research',
    description: 'Problem framing, ideas, hypotheses, pros/cons, and next steps',
    icon: Lightbulb,
    getHtml: (title: string) => `
      <h1>💡 Brainstorming: ${title || 'Creative Exploration'}</h1>
      <p><strong>Context & Purpose:</strong> Exploring ideas and evaluating tradeoffs.</p>
      <hr />
      
      <h3>Problem Statement</h3>
      <p>What specific challenge or user need are we addressing? Why is it important to solve now?</p>
      
      <h3>Potential Solutions & Angles</h3>
      <ul>
        <li><strong>Option A:</strong> Direct, minimalist implementation focusing on simplicity.</li>
        <li><strong>Option B:</strong> Modular, extensible architecture with customizable options.</li>
        <li><strong>Option C:</strong> Automated smart defaults with minimal user configuration.</li>
      </ul>
      
      <blockquote>
        "The best solution is usually the one that removes unnecessary complexity while empowering the user to accomplish their goal."
      </blockquote>
      
      <h3>Trade-off Analysis</h3>
      <p>Evaluating each approach based on technical feasibility, development effort, and user value.</p>
      
      <h3>Recommended Action & Next Steps</h3>
      <ol>
        <li>Build a fast proof-of-concept for the leading candidate.</li>
        <li>Gather feedback from 3 team members.</li>
        <li>Synthesize takeaways into actionable engineering tasks.</li>
      </ol>
    `.trim(),
  }
];

export default function TaskRichNotes({
  initialNotes = '',
  notesUpdatedAt,
  taskTitle,
  onSave,
  className
}: TaskRichNotesProps) {
  const [htmlContent, setHtmlContent] = useState<string>(initialNotes);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const fullscreenEditorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);

  // Sync initial content when task changes
  useEffect(() => {
    setHtmlContent(initialNotes || '');
    if (editorRef.current && editorRef.current.innerHTML !== (initialNotes || '')) {
      editorRef.current.innerHTML = initialNotes || '';
    }
    if (fullscreenEditorRef.current && fullscreenEditorRef.current.innerHTML !== (initialNotes || '')) {
      fullscreenEditorRef.current.innerHTML = initialNotes || '';
    }
    setSaveStatus('saved');
  }, [initialNotes]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Compute text statistics
  const getTextStats = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.innerText || tempDiv.textContent || '';
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = trimmed.length;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    const isEmpty = chars === 0;
    return { words, chars, readingTime, isEmpty };
  };

  const { words, chars, readingTime, isEmpty } = getTextStats(htmlContent);

  // Trigger Save with debouncing
  const triggerAutoSave = (newHtml: string) => {
    setSaveStatus('unsaved');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus('saving');
      onSave(newHtml);
      setTimeout(() => {
        setSaveStatus('saved');
      }, 400);
    }, 800);
  };

  const handleManualSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus('saving');
    onSave(htmlContent);
    setTimeout(() => {
      setSaveStatus('saved');
    }, 300);
  };

  // Content input handler
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const newHtml = target.innerHTML;
    setHtmlContent(newHtml);
    triggerAutoSave(newHtml);
  };

  // Format command executor
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    const activeEditor = isFullscreen ? fullscreenEditorRef.current : editorRef.current;
    if (activeEditor) {
      activeEditor.focus();
    }
    document.execCommand(command, false, value);
    if (activeEditor) {
      const newHtml = activeEditor.innerHTML;
      setHtmlContent(newHtml);
      triggerAutoSave(newHtml);
    }
  };

  // Insert custom HTML block
  const insertCustomHtml = (htmlSnippet: string) => {
    const activeEditor = isFullscreen ? fullscreenEditorRef.current : editorRef.current;
    if (!activeEditor) return;
    activeEditor.focus();

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const div = document.createElement('div');
      div.innerHTML = htmlSnippet;
      const frag = document.createDocumentFragment();
      let node: ChildNode | null = null;
      let lastNode: ChildNode | null = null;
      while ((node = div.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);
      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      activeEditor.innerHTML += htmlSnippet;
    }

    const newHtml = activeEditor.innerHTML;
    setHtmlContent(newHtml);
    triggerAutoSave(newHtml);
  };

  // Save current selection for modal actions (like link modal)
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
      }
    }
  };

  // Insert Link
  const handleOpenLinkModal = () => {
    saveSelection();
    const selection = window.getSelection();
    const text = selection ? selection.toString() : '';
    setLinkText(text);
    setLinkUrl('');
    setShowLinkModal(true);
  };

  const handleApplyLink = () => {
    setShowLinkModal(false);
    restoreSelection();
    if (!linkUrl.trim()) return;

    let validUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(validUrl)) {
      validUrl = `https://${validUrl}`;
    }

    const activeEditor = isFullscreen ? fullscreenEditorRef.current : editorRef.current;
    if (activeEditor) {
      activeEditor.focus();
    }

    if (linkText.trim()) {
      const linkHtml = `<a href="${validUrl}" target="_blank" rel="noopener noreferrer">${linkText.trim()}</a>`;
      insertCustomHtml(linkHtml);
    } else {
      executeCommand('createLink', validUrl);
    }
  };

  // Apply template
  const handleApplyTemplate = (templateId: string) => {
    const tpl = TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;

    if (!isEmpty && !window.confirm('Applying this template will replace the current notes content. Do you want to proceed?')) {
      return;
    }

    const newHtml = tpl.getHtml(taskTitle);
    setHtmlContent(newHtml);
    if (editorRef.current) {
      editorRef.current.innerHTML = newHtml;
    }
    if (fullscreenEditorRef.current) {
      fullscreenEditorRef.current.innerHTML = newHtml;
    }
    setShowTemplatesDropdown(false);
    triggerAutoSave(newHtml);
  };

  // Convert HTML to simple markdown
  const convertHtmlToMarkdown = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    let md = '';
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        md += node.textContent;
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        switch (tag) {
          case 'h1':
            md += `\n# `;
            el.childNodes.forEach(walk);
            md += `\n\n`;
            break;
          case 'h2':
            md += `\n## `;
            el.childNodes.forEach(walk);
            md += `\n\n`;
            break;
          case 'h3':
            md += `\n### `;
            el.childNodes.forEach(walk);
            md += `\n\n`;
            break;
          case 'p':
            md += `\n`;
            el.childNodes.forEach(walk);
            md += `\n`;
            break;
          case 'strong':
          case 'b':
            md += `**`;
            el.childNodes.forEach(walk);
            md += `**`;
            break;
          case 'em':
          case 'i':
            md += `*`;
            el.childNodes.forEach(walk);
            md += `*`;
            break;
          case 'u':
            md += `_`;
            el.childNodes.forEach(walk);
            md += `_`;
            break;
          case 'strike':
          case 's':
            md += `~~`;
            el.childNodes.forEach(walk);
            md += `~~`;
            break;
          case 'code':
            md += `\``;
            el.childNodes.forEach(walk);
            md += `\``;
            break;
          case 'pre':
            md += `\n\`\`\`\n`;
            el.childNodes.forEach(walk);
            md += `\n\`\`\`\n\n`;
            break;
          case 'blockquote':
            md += `\n> `;
            el.childNodes.forEach(walk);
            md += `\n\n`;
            break;
          case 'ul':
            el.childNodes.forEach(walk);
            md += `\n`;
            break;
          case 'ol':
            el.childNodes.forEach(walk);
            md += `\n`;
            break;
          case 'li':
            md += `- `;
            el.childNodes.forEach(walk);
            md += `\n`;
            break;
          case 'hr':
            md += `\n---\n\n`;
            break;
          case 'a': {
            const href = el.getAttribute('href') || '#';
            md += `[`;
            el.childNodes.forEach(walk);
            md += `](${href})`;
            break;
          }
          case 'br':
            md += `\n`;
            break;
          default:
            el.childNodes.forEach(walk);
        }
      }
    };

    tempDiv.childNodes.forEach(walk);
    return md.trim();
  };

  // Copy plain text or markdown
  const handleCopyContent = async (type: 'markdown' | 'text') => {
    try {
      let contentToCopy = '';
      if (type === 'markdown') {
        contentToCopy = convertHtmlToMarkdown(htmlContent);
      } else {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        contentToCopy = tempDiv.innerText || tempDiv.textContent || '';
      }

      await navigator.clipboard.writeText(contentToCopy);
      setCopyFeedback(type === 'markdown' ? 'Markdown Copied!' : 'Text Copied!');
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback('Failed to copy');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  // Download as markdown
  const handleDownloadFile = () => {
    const md = convertHtmlToMarkdown(htmlContent);
    const sanitizedTitle = (taskTitle || 'task_notes').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizedTitle}_notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Print notes
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${taskTitle} - Notes</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; padding: 40px; color: #111; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 24px; border-bottom: 2px solid #ddd; padding-bottom: 8px; }
            h2 { font-size: 20px; margin-top: 24px; }
            h3 { font-size: 16px; margin-top: 20px; }
            ul, ol { padding-left: 24px; }
            blockquote { border-left: 4px solid #6366f1; margin: 16px 0; padding: 8px 16px; background: #f8fafc; font-style: italic; }
            pre { background: #f1f5f9; padding: 12px; border-radius: 6px; font-family: monospace; }
            code { background: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
            .note-callout { border: 1px solid #ddd; padding: 12px; border-radius: 8px; margin: 12px 0; }
          </style>
        </head>
        <body>
          <h2>${taskTitle}</h2>
          <hr />
          ${htmlContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Clear notes
  const handleClearNotes = () => {
    if (window.confirm('Are you sure you want to clear all notes for this task?')) {
      setHtmlContent('');
      if (editorRef.current) editorRef.current.innerHTML = '';
      if (fullscreenEditorRef.current) fullscreenEditorRef.current.innerHTML = '';
      triggerAutoSave('');
    }
  };

  // Toolbar Component
  const renderToolbar = (inFullscreen = false) => (
    <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 bg-neutral-50/90 border-b border-neutral-200/80 sticky top-0 z-20 backdrop-blur-xs select-none">
      {/* Primary Formatting Controls */}
      <div className="flex flex-wrap items-center gap-0.5">
        {/* Undo / Redo */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('undo'); }}
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-md transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={15} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('redo'); }}
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-md transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={15} />
        </button>

        <span className="w-px h-4 bg-neutral-200 mx-1" />

        {/* Headings */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('formatBlock', '<h1>'); }}
          className="p-1.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-md font-bold text-xs transition-colors"
          title="Heading 1"
        >
          <Heading1 size={15} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('formatBlock', '<h2>'); }}
          className="p-1.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-md font-bold text-xs transition-colors"
          title="Heading 2"
        >
          <Heading2 size={15} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('formatBlock', '<h3>'); }}
          className="p-1.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-md font-bold text-xs transition-colors"
          title="Heading 3"
        >
          <Heading3 size={15} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('formatBlock', '<p>'); }}
          className="px-1.5 py-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-md font-semibold text-xs transition-colors"
          title="Normal Text / Paragraph"
        >
          ¶
        </button>

        <span className="w-px h-4 bg-neutral-200 mx-1" />

        {/* Inline styles */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('bold'); }}
          className="p-1.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-md transition-colors"
          title="Bold (Ctrl+B)"
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('italic'); }}
          className="p-1.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-md transition-colors"
          title="Italic (Ctrl+I)"
        >
          <Italic size={15} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('underline'); }}
          className="p-1.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-md transition-colors"
          title="Underline (Ctrl+U)"
        >
          <Underline size={15} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('strikeThrough'); }}
          className="p-1.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-md transition-colors"
          title="Strikethrough"
        >
          <Strikethrough size={15} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('formatBlock', '<pre>');
          }}
          className="p-1.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-md transition-colors"
          title="Code Block"
        >
          <Code size={15} />
        </button>

        <span className="w-px h-4 bg-neutral-200 mx-1" />

        {/* Lists & Quotes */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('insertUnorderedList'); }}
          className="p-1.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-md transition-colors"
          title="Bulleted List"
        >
          <List size={15} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('insertOrderedList'); }}
          className="p-1.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-md transition-colors"
          title="Numbered List"
        >
          <ListOrdered size={15} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            insertCustomHtml('<div class="note-callout note-callout-info"><strong>💡 Note:</strong> Add callout details here...</div><p></p>');
          }}
          className="p-1.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-md transition-colors"
          title="Insert Callout Box"
        >
          <Lightbulb size={15} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('formatBlock', '<blockquote>'); }}
          className="p-1.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-md transition-colors"
          title="Blockquote"
        >
          <Quote size={15} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('insertHorizontalRule'); }}
          className="p-1.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-md transition-colors"
          title="Horizontal Divider"
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); handleOpenLinkModal(); }}
          className="p-1.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-md transition-colors"
          title="Insert Hyperlink"
        >
          <Link2 size={15} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('removeFormat'); }}
          className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/70 rounded-md transition-colors"
          title="Clear Formatting"
        >
          <RemoveFormatting size={15} />
        </button>
      </div>

      {/* Right Side Actions: Templates, Save, Fullscreen */}
      <div className="flex items-center gap-1.5 ml-auto">
        {/* Template Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTemplatesDropdown(!showTemplatesDropdown)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200/80 transition-colors"
            title="Load starter document templates"
          >
            <Sparkles size={13} className="text-purple-600" />
            <span>Templates</span>
            <ChevronDown size={12} />
          </button>

          {showTemplatesDropdown && (
            <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-neutral-100 p-2 z-30 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-2 py-1 border-b border-neutral-100 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Starter Templates
                </span>
              </div>
              {TEMPLATES.map((tpl) => {
                const IconComponent = tpl.icon;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl.id)}
                    className="w-full text-left p-2 hover:bg-purple-50/60 rounded-xl transition-colors group flex items-start gap-2.5"
                  >
                    <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg shrink-0 group-hover:scale-105 transition-transform">
                      <IconComponent size={14} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 group-hover:text-purple-900 block">
                        {tpl.title}
                      </span>
                      <span className="text-[10px] text-neutral-500 leading-tight block">
                        {tpl.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Save Status / Button */}
        <button
          type="button"
          onClick={handleManualSave}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
            saveStatus === 'saved' 
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100" 
              : saveStatus === 'saving'
              ? "bg-amber-50 text-amber-700 border border-amber-200/60"
              : "bg-neutral-900 text-white hover:bg-neutral-800 shadow-xs"
          )}
          title="Save notes"
        >
          {saveStatus === 'saved' ? (
            <>
              <Check size={13} className="text-emerald-600" />
              <span>Saved</span>
            </>
          ) : saveStatus === 'saving' ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={13} />
              <span>Save</span>
            </>
          )}
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-md transition-colors"
          title={inFullscreen ? "Exit full screen" : "Expand to distraction-free full screen"}
        >
          {inFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Notes Header Card */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-teal-100 text-teal-700 rounded-lg shadow-2xs">
            <FileText size={17} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <span>Task Notes & Documentation</span>
              {!isEmpty && (
                <span className="text-[10px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100/80 lowercase">
                  {words} words • {readingTime} min read
                </span>
              )}
            </h3>
            <p className="text-[10px] text-neutral-400 font-medium">
              Meeting minutes, project specifications, scratchpad & drafts
            </p>
          </div>
        </div>

        {/* Quick Utilities Dropdown / Buttons */}
        <div className="flex items-center gap-1.5">
          {copyFeedback && (
            <span className="text-[11px] font-semibold text-emerald-600 animate-in fade-in duration-200">
              {copyFeedback}
            </span>
          )}

          {!isEmpty && (
            <>
              <button
                type="button"
                onClick={() => handleCopyContent('markdown')}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-neutral-600 hover:text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors"
                title="Copy formatted markdown to clipboard"
              >
                <Copy size={11} />
                <span>Copy .md</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadFile}
                className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg border border-neutral-200 transition-colors"
                title="Download notes file (.md)"
              >
                <Download size={13} />
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg border border-neutral-200 transition-colors"
                title="Print or export to PDF"
              >
                <Printer size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor Box */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl shadow-xs overflow-hidden focus-within:ring-2 focus-within:ring-neutral-900/10 focus-within:border-neutral-400 transition-all">
        {renderToolbar(false)}

        {/* Empty state recommendation banner if no notes yet */}
        {isEmpty && (
          <div className="p-4 bg-gradient-to-r from-teal-50/40 via-purple-50/40 to-blue-50/40 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <Sparkles size={14} className="text-purple-600" />
                <span>Start typing, or choose a document blueprint</span>
              </h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Quickly insert meeting minutes or project draft scaffolding.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleApplyTemplate(t.id)}
                  className="px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-white hover:bg-purple-50 border border-purple-200 rounded-lg shadow-2xs transition-all"
                >
                  + {t.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ContentEditable Container */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleInput}
          data-placeholder="Write meeting notes, project requirements, agendas, or scratchpad here..."
          className="rich-notes-content p-4 min-h-[220px] max-h-[500px] overflow-y-auto outline-none selection:bg-teal-100 selection:text-teal-900"
        />

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-neutral-50/70 border-t border-neutral-100 text-[10px] text-neutral-400 font-medium">
          <div className="flex items-center gap-2">
            <span>{words} words</span>
            <span>•</span>
            <span>{chars} characters</span>
            {notesUpdatedAt && (
              <>
                <span>•</span>
                <span>Last updated {format(new Date(notesUpdatedAt), 'MMM d, h:mm a')}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isEmpty && (
              <button
                type="button"
                onClick={handleClearNotes}
                className="text-neutral-400 hover:text-red-500 transition-colors"
                title="Clear notes"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FULLSCREEN DISTRACTION-FREE MODAL */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex flex-col p-2 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl h-full mx-auto rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-neutral-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 text-teal-800 rounded-xl">
                  <FileText size={20} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                    Distraction-Free Workspace
                  </span>
                  <h2 className="text-base font-bold text-neutral-900 truncate max-w-md sm:max-w-xl">
                    {taskTitle}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-500 mr-2">
                  <span className="font-semibold text-neutral-700">{words} words</span>
                  <span>•</span>
                  <span>{chars} chars</span>
                  <span>•</span>
                  <span>~{readingTime} min read</span>
                </div>

                <button
                  type="button"
                  onClick={handleManualSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  <Save size={14} />
                  <span>Save Notes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors ml-1"
                  title="Close distraction-free editor"
                >
                  <Minimize2 size={18} />
                </button>
              </div>
            </div>

            {/* Modal Toolbar */}
            {renderToolbar(true)}

            {/* Modal Editor Body */}
            <div className="flex-1 overflow-y-auto p-8 sm:p-12 bg-white">
              <div className="max-w-3xl mx-auto min-h-full">
                <div
                  ref={fullscreenEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleInput}
                  onBlur={handleInput}
                  data-placeholder="Write long-form project notes, comprehensive meeting minutes, action items..."
                  className="rich-notes-content min-h-[500px] outline-none text-base leading-relaxed selection:bg-teal-100 selection:text-teal-900"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-100 bg-neutral-50/80 text-xs text-neutral-500 font-medium">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleCopyContent('markdown')}
                  className="hover:text-neutral-900 flex items-center gap-1"
                >
                  <Copy size={13} />
                  <span>Copy Markdown</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadFile}
                  className="hover:text-neutral-900 flex items-center gap-1"
                >
                  <Download size={13} />
                  <span>Download .md</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="hover:text-neutral-900 flex items-center gap-1"
                >
                  <Printer size={13} />
                  <span>Print Document</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {saveStatus === 'saved' ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                    <Check size={14} />
                    <span>All changes saved to cloud</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600 font-semibold text-xs">
                    <span>Unsaved draft changes...</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insert Link Dialog Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-neutral-900">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                <Link2 size={18} />
              </div>
              <h3 className="font-bold text-base">Insert Hyperlink</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 block mb-1">
                  Destination URL *
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full text-xs p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-900"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 block mb-1">
                  Display Text (Optional)
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Link description"
                  className="w-full text-xs p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-900"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyLink}
                disabled={!linkUrl.trim()}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 rounded-xl transition-colors"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
