'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

interface UploadedFile {
  id: string
  file: File
  uploadedAt: string
  storagePath?: string
  status?: 'pending' | 'uploading' | 'uploaded' | 'error'
}

interface FileUploadStore {
  // State
  uploadedFiles: UploadedFile[]
  maxFiles: number
  uploading: boolean
  
  // Actions
  addFiles: (files: File[]) => void
  removeFile: (id: string) => void
  clearFiles: () => void
  canAddMore: () => boolean
  uploadToSupabase: (userId: string, chatId?: string) => Promise<void>
}

export const useFileUploadStore = create<FileUploadStore>((set, get) => ({
  uploadedFiles: [],
  maxFiles: 3,
  uploading: false,

  addFiles: (files: File[]) => {
    const currentFiles = get().uploadedFiles
    const maxFiles = get().maxFiles
    const availableSlots = maxFiles - currentFiles.length

    if (availableSlots <= 0) {
      return
    }

    const filesToAdd = files.slice(0, availableSlots).map(file => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      uploadedAt: new Date().toISOString(),
      status: 'pending' as const
    }))

    set(state => ({
      uploadedFiles: [...state.uploadedFiles, ...filesToAdd]
    }))
  },

  removeFile: (id: string) => {
    set(state => ({
      uploadedFiles: state.uploadedFiles.filter(f => f.id !== id)
    }))
  },

  clearFiles: () => {
    set({ uploadedFiles: [] })
  },

  canAddMore: () => {
    const currentFiles = get().uploadedFiles
    const maxFiles = get().maxFiles
    return currentFiles.length < maxFiles
  },

  uploadToSupabase: async (userId: string, chatId?: string) => {
    const files = get().uploadedFiles
    if (files.length === 0) return

    set({ uploading: true })

    try {
      const supabase = createClient()
      let failedUploads = 0

      for (const uploadedFile of files) {
        // Update status to uploading
        set(state => ({
          uploadedFiles: state.uploadedFiles.map(f =>
            f.id === uploadedFile.id ? { ...f, status: 'uploading' as const } : f
          )
        }))

        // Upload to Supabase Storage
        const fileExt = uploadedFile.file.name.split('.').pop()
        const fileName = `${uploadedFile.id}.${fileExt}`
        const filePath = `${userId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, uploadedFile.file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          failedUploads += 1
          set(state => ({
            uploadedFiles: state.uploadedFiles.map(f =>
              f.id === uploadedFile.id ? { ...f, status: 'error' as const } : f
            )
          }))
          continue
        }

        // Save document metadata to database
        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            user_id: userId,
            chat_id: chatId,
            file_name: uploadedFile.file.name,
            file_size: uploadedFile.file.size,
            file_type: uploadedFile.file.type,
            storage_path: filePath,
            status: 'completed'
          } as never)

        if (dbError) {
          console.error('Database error:', dbError)
          failedUploads += 1
          set(state => ({
            uploadedFiles: state.uploadedFiles.map(f =>
              f.id === uploadedFile.id ? { ...f, status: 'error' as const } : f
            )
          }))
          continue
        }

        // Update status to uploaded
        set(state => ({
          uploadedFiles: state.uploadedFiles.map(f =>
            f.id === uploadedFile.id 
              ? { ...f, status: 'uploaded' as const, storagePath: filePath } 
              : f
          )
        }))
      }

      if (failedUploads > 0) {
        throw new Error(`Failed to upload ${failedUploads} document${failedUploads === 1 ? '' : 's'} to Supabase.`)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      throw error
    } finally {
      set({ uploading: false })
    }
  }
}))
