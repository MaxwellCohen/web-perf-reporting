import { DeviceType } from '@/lib/schema';

type DeviceScopedItem = {
  _device?: DeviceType;
};

export function getItemDevice<T extends DeviceScopedItem>(
  item: T,
  fallbackDevice: DeviceType,
): DeviceType {
  return item._device || fallbackDevice;
}
