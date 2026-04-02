import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { DocumentRow } from './DocumentActions'

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>
}) {
  const { folder: folderId } = await searchParams
  const supabase = await createClient()

  const [{ data: folders }, { data: documents }] = await Promise.all([
    supabase
      .from('document_folders')
      .select('*')
      .is('parent_id', null)
      .order('name'),
    folderId
      ? supabase
          .from('doc_library')
          .select('*')
          .eq('folder_id', folderId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  const currentFolder = folders?.find((f) => f.id === folderId)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
      </div>

      <div className="flex gap-6">
        {/* Folder sidebar */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <p className="text-sm font-semibold text-gray-700">Folders</p>
            </div>
            <nav className="py-2">
              {folders?.map((folder) => (
                <Link
                  key={folder.id}
                  href={`/documents?folder=${folder.id}`}
                  className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${
                    folderId === folder.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700'
                  }`}
                >
                  📁 {folder.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Document list */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <p className="font-semibold text-gray-900">
                {currentFolder ? currentFolder.name : 'Select a folder'}
              </p>
            </div>

            {!folderId ? (
              <div className="p-12 text-center text-gray-400">
                Select a folder on the left to view documents
              </div>
            ) : documents && documents.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {documents.map((doc: any) => (
                  <DocumentRow key={doc.id} doc={doc} />
                ))}
              </ul>
            ) : (
              <div className="p-12 text-center text-gray-400">
                No documents in this folder yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
