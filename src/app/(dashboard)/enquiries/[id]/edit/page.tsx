import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EnquiryEditForm from './EnquiryEditForm'

export default async function EditEnquiryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: enquiry, error } = await supabase
    .from('enquiries')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !enquiry) notFound()

  return <EnquiryEditForm enquiry={enquiry} />
}
