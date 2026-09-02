import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { CreateProductModal } from './Minimart/CreateProductModal';
import { UserBadgeItem } from '../ui/UserBadgeItem';
import { X, Image as ImageIcon, Tag, Send, AlertCircle, FileText, ShoppingBag, Crown, Upload } from 'lucide-react';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_ATTACHMENTS = [
  { name: 'Study Group', url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80' },
  { name: 'STEM Lab', url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80' },
  { name: 'Campus Library', url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&auto=format&fit=crop&q=80' },
  { name: 'Championship', url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop&q=80' },
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, createPost } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [postType, setPostType] = useState<'post' | 'product'>('post');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['Academic', 'Grobax']);
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  if (postType === 'product') {
    return (
      <CreateProductModal
        isOpen={isOpen}
        onClose={() => {
          setPostType('post');
          onClose();
        }}
      />
    );
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim().replace(/^#/, '')]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      if (base64) {
        setImageUrl(base64);
        setShowImageInput(true);
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Post content cannot be empty.');
      return;
    }

    if (currentUser.isPostingSuspended) {
      setError('Your posting privileges have been suspended by an Administrator.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await createPost(content, tags, imageUrl ? imageUrl : undefined);
      setContent('');
      setImageUrl('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to publish post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Create Community Post</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Post Type Selector */}
        <div className="grid grid-cols-2 gap-2 mt-3 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          <button
            type="button"
            onClick={() => setPostType('post')}
            className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              postType === 'post'
                ? 'bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Scholar Post</span>
          </button>
          <button
            type="button"
            onClick={() => setPostType('product')}
            className="py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400 hover:bg-white/50 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>List on Minimart</span>
            <Crown className="w-3 h-3 text-amber-500" />
          </button>
        </div>

        {/* Suspended Notice */}
        {currentUser.isPostingSuspended && (
          <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>Posting disabled: Your account has been suspended from publishing posts.</span>
          </div>
        )}

        {/* User Card */}
        <div className="flex items-center gap-3 mt-4">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-10 h-10 rounded-full object-cover border border-blue-900/30"
          />
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5 flex-wrap">
              <UserBadgeItem
                name={currentUser.name}
                verified={currentUser.verified !== false}
                isPremium={Boolean(
                  currentUser.isPremium ||
                  (currentUser.membershipTier && !currentUser.membershipTier.toLowerCase().includes('free')) ||
                  (currentUser.subscriptionTier && !currentUser.subscriptionTier.toLowerCase().includes('free'))
                )}
                membershipTier={currentUser.membershipTier || currentUser.subscriptionTier}
                equippedBadge={currentUser.equippedBadge}
                role={currentUser.role}
                isStaffOrAdmin={
                  currentUser.role === 'admin' ||
                  currentUser.role === 'super_admin' ||
                  currentUser.name.toLowerCase().includes('admin') ||
                  currentUser.name.toLowerCase().includes('staff')
                }
                isCommunityManager={
                  currentUser.role === 'community_manager' ||
                  currentUser.name.toLowerCase().includes('community manager')
                }
                size="sm"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {currentUser.privacy?.showAcademicInfoOnPosts !== false
                ? `${currentUser.institution || 'Grobax Scholar'}${currentUser.department ? ` • ${currentUser.department}` : ''}`
                : 'Verified Grobax Scholar'}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <textarea
              rows={4}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What academic insight, question, or Grobax competition update do you want to share?"
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-900 focus:outline-hidden resize-none"
            />
          </div>

          {/* Image Attachment Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> Picture Attachment
              </span>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3 h-3" /> Upload File
                </button>
                {!showImageInput && (
                  <button
                    type="button"
                    onClick={() => setShowImageInput(true)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                  >
                    Add URL
                  </button>
                )}
              </div>
            </div>

            {showImageInput && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Paste image URL (https://...)"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowImageInput(false)}
                    className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-xs rounded-xl text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                {/* Preset Suggestions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400">Presets:</span>
                  {PRESET_ATTACHMENTS.map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setImageUrl(preset.url);
                        setShowImageInput(true);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-500/10 text-slate-600 dark:text-slate-300 hover:text-blue-600 text-[10px] font-semibold transition cursor-pointer"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {imageUrl && (
              <div className="relative rounded-xl overflow-hidden max-h-40 border border-slate-200 dark:border-slate-700 bg-slate-950">
                <img src={imageUrl} alt="Attachment" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 p-1 bg-slate-900/80 text-white rounded-full hover:bg-slate-900 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tags:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(t => (
                <span
                  key={t}
                  className="px-2 py-0.5 bg-blue-500/10 text-blue-900 dark:text-blue-400 border border-blue-500/20 text-xs rounded-full flex items-center gap-1 font-medium"
                >
                  #{t}
                  <button type="button" onClick={() => handleRemoveTag(t)}>
                    <X className="w-3 h-3 hover:text-rose-500" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add hashtag (e.g. STEM, UNILAG)"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-900"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-xs font-semibold rounded-lg text-slate-800 dark:text-slate-200"
              >
                Add Tag
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={currentUser.isPostingSuspended || isSubmitting}
              className="px-5 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-950/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Publishing...' : 'Publish Post'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

