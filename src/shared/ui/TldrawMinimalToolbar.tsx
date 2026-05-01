import {
  AssetToolbarItem,
  DefaultToolbar,
  HandToolbarItem,
  SelectToolbarItem,
} from "tldraw";

export function TldrawMinimalToolbar() {
  return (
    <DefaultToolbar>
      <SelectToolbarItem />
      <HandToolbarItem />
      <AssetToolbarItem />
    </DefaultToolbar>
  );
}
