import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { generateId } from '@/utils/id';
import { newRecord } from './recordUtil';
import { insertAttachment } from '@/repositories/financialRepository';
import type { User, Attachment } from '@/types';

const PHOTO_DIR = 'photos';

export type PhotoEntity = 'earning' | 'expense' | 'investment' | 'daily_status';

export interface PickedPhoto {
  uri: string;
  width: number;
  height: number;
  mimeType?: string;
}

/**
 * Launch camera or gallery, then compress and persist locally.
 */
export async function pickAndPersistPhoto(
  user: User,
  entityType: PhotoEntity,
  entityId: string,
  source: 'camera' | 'gallery'
): Promise<Attachment> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error('Photo permission denied.');
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ['images'] });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    throw new Error('No photo selected.');
  }

  const asset = result.assets[0]!;
  return persistPhoto(user, entityType, entityId, asset.uri, asset.mimeType ?? 'image/jpeg');
}

async function persistPhoto(
  user: User,
  entityType: PhotoEntity,
  entityId: string,
  uri: string,
  mimeType: string
): Promise<Attachment> {
  const dir = `${FileSystem.Paths.document}${PHOTO_DIR}`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  // Compress via ImageManipulator (max 1600px, JPEG 0.7)
  let compressedUri = uri;
  try {
    const manipulated = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1600 } }], {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    compressedUri = manipulated.uri;
  } catch {
    // If manipulation fails, keep original.
  }

  const fileExt = mimeType.includes('png') ? 'png' : 'jpg';
  const destName = `${generateId()}.${fileExt}`;
  const dest = `${dir}/${destName}`;
  await FileSystem.copyAsync({ from: compressedUri, to: dest });

  const fileInfo = await FileSystem.getInfoAsync(dest);

  const attachment: Attachment = {
    id: generateId(),
    entity_type: entityType,
    entity_id: entityId,
    local_uri: dest,
    remote_uri: null,
    mime_type: mimeType,
    size_bytes: (fileInfo as { size?: number }).size ?? 0,
    upload_state: 'pending',
    ...newRecord(user.id),
  };
  await insertAttachment(attachment);
  return attachment;
}

export async function removePhotoFile(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
}