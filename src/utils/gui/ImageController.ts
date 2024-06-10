import { Controller, GUI } from "lil-gui";

declare module "lil-gui" {
  interface GUI {
    addImage(object: any, property: string): ImageController;
  }
}

export class ImageController extends Controller {
  $backupImage: string = new URL("./image.png", import.meta.url).toString();
  $input: HTMLInputElement;
  $imagePreview: HTMLImageElement;

  constructor(parent: GUI, object: any, property: string) {
    super(parent, object, property, "image");

    this.$input = document.createElement("input");
    this.$input.type = "file";
    this.$input.accept = "image/*";
    this.$input.onchange = () => {
      const file = this.$input.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        this.setValue(url);
        this.updateDisplay();
      }
    };

    this.$imagePreview = document.createElement("img");
    this.$imagePreview.style.width = "100px";
    this.$imagePreview.style.height = "100px";
    this.$imagePreview.style.objectFit = "cover";

    this.$widget.appendChild(this.$imagePreview);
    this.$widget.onclick = () => {
      this.$input.click();
    };

    this.updateDisplay();
  }

  override updateDisplay() {
    this.$imagePreview.src = this.getValue() ?? this.$backupImage;
    return this;
  }
}

GUI.prototype.addImage = function (object: any, property: string) {
  return new ImageController(this, object, property);
};
