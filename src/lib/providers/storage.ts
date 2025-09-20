// Storage Provider abstraction layer
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config'
import { v4 as uuidv4 } from 'uuid'

export interface PresignedUpload {
  uploadUrl: string
  fileUrl: string
  fields?: Record<string, string>
  fileId: string
}

export interface FileMetadata {
  fileId: string
  originalName: string
  mimeType: string
  size: number
  url: string
}

export abstract class StorageProvider {
  abstract presignUpload(
    fileName: string,
    mimeType: string,
    userId: string
  ): Promise<PresignedUpload>
  
  abstract commitUpload(
    fileId: string,
    metadata: Omit<FileMetadata, 'fileId' | 'url'>
  ): Promise<FileMetadata>
}

export class SupabaseProvider extends StorageProvider {
  private client: SupabaseClient

  constructor() {
    super()
    this.client = createClient(
      config.storage.supabase.url,
      config.storage.supabase.serviceKey
    )
  }

  async presignUpload(
    fileName: string,
    mimeType: string,
    userId: string
  ): Promise<PresignedUpload> {
    const fileId = uuidv4()
    const fileExtension = fileName.split('.').pop() || 'unknown'
    const storagePath = `uploads/${userId}/${fileId}.${fileExtension}`

    // Create presigned URL for upload
    const { data, error } = await this.client.storage
      .from('media')
      .createSignedUploadUrl(storagePath)

    if (error) {
      console.error('Supabase presign error:', error)
      throw new Error(`Failed to create presigned upload URL: ${error.message}`)
    }

    // Get public URL for the file
    const { data: { publicUrl } } = this.client.storage
      .from('media')
      .getPublicUrl(storagePath)

    return {
      uploadUrl: data.signedUrl,
      fileUrl: publicUrl,
      fileId,
      fields: {
        'Content-Type': mimeType,
      },
    }
  }

  async commitUpload(
    fileId: string,
    metadata: Omit<FileMetadata, 'fileId' | 'url'>
  ): Promise<FileMetadata> {
    // In Supabase, we can verify the file was uploaded successfully
    const fileExtension = metadata.originalName.split('.').pop() || 'unknown'
    const storagePath = `uploads/${fileId}/${fileId}.${fileExtension}`

    const { data, error } = await this.client.storage
      .from('media')
      .list(storagePath)

    if (error || !data?.length) {
      throw new Error('File upload was not completed successfully')
    }

    const { data: { publicUrl } } = this.client.storage
      .from('media')
      .getPublicUrl(storagePath)

    return {
      fileId,
      url: publicUrl,
      ...metadata,
    }
  }
}

// Provider factory
export function createStorageProvider(): StorageProvider {
  switch (config.storage.provider) {
    case 'supabase':
      return new SupabaseProvider()
    default:
      throw new Error(`Unsupported storage provider: ${config.storage.provider}`)
  }
}