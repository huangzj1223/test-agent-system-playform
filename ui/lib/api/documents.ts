// NOTE  MC8yOmFIVnBZMlhwdTRUbGphRG1zWjg2T0VSaVpnPT06OWU3NThjNjQ=

/**
 * 文档上传 API
 */

import { t } from "@/lib/translations";

export interface DocumentUploadResponse {
  success: boolean;
  data: {
    object_name: string;
    file_name: string;
    file_size: number;
    content_type: string;
    url: string;
  };
}

/**
 * 上传文档到 MinIO
 */
export async function uploadDocument(file: File): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/v2/documents/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || t("common.uploadFailed"));
  }

  return response.json();
}
// FIXME  MS8yOmFIVnBZMlhwdTRUbGphRG1zWjg2T0VSaVpnPT06OWU3NThjNjQ=

