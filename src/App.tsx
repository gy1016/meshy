import { useCallback, useRef, type DragEvent } from 'react'
import { Tldraw, type Editor, type TLOnMountHandler } from 'tldraw'
import 'tldraw/tldraw.css'

function App() {
  const editorRef = useRef<Editor | null>(null)

  const handleMount = useCallback<TLOnMountHandler>((editor) => {
    editorRef.current = editor

    return () => {
      editorRef.current = null
    }
  }, [])

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!editorRef.current || files.length === 0) return

    const imageFiles = files.filter((file) => file.type.startsWith('image/'))
    if (imageFiles.length === 0) return

    await editorRef.current.putExternalContent({
      type: 'files',
      files: imageFiles,
    })
  }, [])

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes('Files')) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const onDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      const dropped = Array.from(event.dataTransfer.files ?? [])
      if (dropped.length === 0) return

      event.preventDefault()
      await uploadFiles(dropped)
    },
    [uploadFiles]
  )

  return (
    <div className="app-shell" onDragOver={onDragOver} onDrop={onDrop}>
      <Tldraw
        onMount={handleMount}
        components={{
          TopPanel: null,
          MenuPanel: null,
          SharePanel: null,
          HelpMenu: null,
          ActionsMenu: null,
          QuickActions: null,
          NavigationPanel: null,
          ZoomMenu: null,
          Minimap: null,
          StylePanel: null,
          PageMenu: null,
          HelperButtons: null,
        }}
      />
    </div>
  )
}

export default App
