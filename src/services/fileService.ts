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

/** Pick one camera photo or up to five proof/receipt photos from the gallery. */
export async function pickPhotos(source: 'camera' | 'gallery'): Promise<PickedPhoto[]> {
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
      : await ImagePicker.launchImageLibraryAsync({
          quality: 0.7,
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          selectionLimit: 5,
        });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return [];
  }

  return result.assets.map((asset) => ({
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType ?? 'image/jpeg',
  }));
}

/** Persist one selected photo after the parent financial record has an ID. */
export async function persistPickedPhoto(
  user: User,
  entityType: PhotoEntity,
  entityId: string,
  photo: PickedPhoto
): Promise<Attachment> {
  return persistPhoto(user, entityType, entityId, photo.uri, photo.mimeType ?? 'image/jpeg');
}

/** Backwards-compatible single-photo helper. */
export async function pickAndPersistPhoto(
  user: User,
  entityType: PhotoEntity,
  entityId: string,
  source: 'camera' | 'gallery'
): Promise<Attachment> {
  const photos = await pickPhotos(source);
  if (!photos[0]) throw new Error('No photo selected.');
  return persistPickedPhoto(user, entityType, entityId, photos[0]);
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
