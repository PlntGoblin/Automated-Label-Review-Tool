export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip "data:image/png;base64," prefix — backend expects raw base64
      const base64 = result.split(',')[1]
      if (base64) resolve(base64)
      else reject(new Error('Failed to read file as base64'))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
