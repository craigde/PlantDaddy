//
//  ImagePicker.swift
//  PlantDaddy
//
//  Photo picker component using PhotosUI (iOS 16+)
//

import SwiftUI
import PhotosUI

struct ImagePicker: View {
    @Binding var selectedImage: UIImage?
    @State private var selectedItem: PhotosPickerItem?

    let onImageSelected: (UIImage) -> Void

    var body: some View {
        PhotosPicker(
            selection: $selectedItem,
            matching: .images,
            photoLibrary: .shared()
        ) {
            if let selectedImage = selectedImage {
                Image(uiImage: selectedImage)
                    .resizable()
                    .scaledToFill()
                    .frame(height: 200)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(alignment: .bottomTrailing) {
                        Image(systemName: "pencil.circle.fill")
                            .font(.system(size: 30))
                            .foregroundColor(.white)
                            .background(Circle().fill(Color.green))
                            .padding(8)
                    }
            } else {
                VStack(spacing: 12) {
                    Image(systemName: "camera.fill")
                        .font(.system(size: 40))
                        .foregroundColor(.green)

                    Text("Add Photo")
                        .font(.headline)

                    Text("Tap to select from library")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 200)
                .background(Color.gray.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.green, style: StrokeStyle(lineWidth: 2, dash: [10]))
                )
            }
        }
        .onChange(of: selectedItem) { newItem in
            Task {
                if let newItem = newItem,
                   let data = try? await newItem.loadTransferable(type: Data.self),
                   let uiImage = UIImage(data: data) {
                    selectedImage = uiImage
                    onImageSelected(uiImage)
                }
            }
        }
    }
}

// Camera Picker using UIImagePickerController
struct CameraPicker: UIViewControllerRepresentable {
    @Environment(\.dismiss) private var dismiss
    @Binding var image: UIImage?
    let sourceType: UIImagePickerController.SourceType
    let onImagePicked: (UIImage) -> Void

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = sourceType
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker

        init(_ parent: CameraPicker) {
            self.parent = parent
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            if let image = info[.originalImage] as? UIImage {
                parent.image = image
                parent.onImagePicked(image)
            }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}

// Image Picker with both camera and library options
struct ImagePickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedImage: UIImage?
    @State private var showingCamera = false
    @State private var showingLibrary = false

    let onImageSelected: (UIImage) -> Void

    var body: some View {
        NavigationStack {
            List {
                Button(action: { showingCamera = true }) {
                    Label("Take Photo", systemImage: "camera.fill")
                }

                Button(action: { showingLibrary = true }) {
                    Label("Choose from Library", systemImage: "photo.fill")
                }

                if selectedImage != nil {
                    Button(role: .destructive, action: removeImage) {
                        Label("Remove Photo", systemImage: "trash.fill")
                    }
                }
            }
            .navigationTitle("Add Photo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showingCamera) {
                CameraPicker(
                    image: $selectedImage,
                    sourceType: .camera,
                    onImagePicked: handleImagePicked
                )
            }
            .sheet(isPresented: $showingLibrary) {
                CameraPicker(
                    image: $selectedImage,
                    sourceType: .photoLibrary,
                    onImagePicked: handleImagePicked
                )
            }
        }
    }

    private func handleImagePicked(_ image: UIImage) {
        selectedImage = image
        onImageSelected(image)
        dismiss()
    }

    private func removeImage() {
        selectedImage = nil
        dismiss()
    }
}

#Preview {
    ImagePicker(selectedImage: .constant(nil)) { _ in }
}
