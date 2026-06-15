import { useState, useRef } from 'react'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

interface ImageUploadProps {
  url: string
  onUpload: (url: string) => void
  bucket?: string
  folder?: string
}

export function ImageUpload({ url, onUpload, bucket = 'assets', folder = 'uploads' }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      setIsUploading(true)

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
      onUpload(data.publicUrl)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Error uploading image. Make sure the file is an image and under 5MB.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = () => {
    onUpload('')
  }

  return (
    <div className="flex flex-col gap-4">
      {url ? (
        <div className="relative group w-32 h-32 border rounded-md overflow-hidden bg-muted">
          <img src={url} alt="Uploaded" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button type="button" variant="destructive" size="icon" onClick={handleRemove}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-32 h-32 border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/50 hover:text-primary cursor-pointer transition-colors"
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <ImageIcon className="h-6 w-6" />
              <span className="text-xs font-medium">Upload Image</span>
            </>
          )}
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleUpload}
        disabled={isUploading}
      />
    </div>
  )
}
