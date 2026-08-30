import { useId } from "react";
import type { WheelOwner } from "./types";
import { OwnerAvatar } from "./WheelOwnerDetails";

type Props = {
  owner?: WheelOwner | null;
  itemTitle: string;
  itemType: "Wheel" | "Stage";
};

export function GalleryOwnerInfo({ owner, itemTitle, itemType }: Props) {
  const tooltipId = useId();
  const resolved = owner || { displayName: "Unavailable creator", avatarUrl: null };
  return <div className="gallery-owner-info">
    <button type="button" className="gallery-owner-info__trigger" aria-label={`${itemType} owner for ${itemTitle}: ${resolved.displayName}`} aria-describedby={tooltipId}>
      <OwnerAvatar owner={resolved} />
    </button>
    <span id={tooltipId} className="gallery-owner-info__tooltip" role="tooltip">
      <small>{itemType} owner</small>
      <strong>{resolved.displayName}</strong>
    </span>
  </div>;
}
