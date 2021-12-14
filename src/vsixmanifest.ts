// Generated by https://quicktype.io

export interface VsixManifest {
    PackageManifest: PackageManifest;
}

export interface PackageManifest {
    $:            PackageManifestClass;
    Metadata:     Metadatum[];
    Installation: Installation[];
    Dependencies: string[];
    Assets:       PackageManifestAsset[];
}

export interface PackageManifestClass {
    Version:   string;
    xmlns:     string;
    "xmlns:d": string;
}

export interface PackageManifestAsset {
    Asset: AssetAsset[];
}

export interface AssetAsset {
    $: Asset;
}

export interface Asset {
    Type:        string;
    Path:        string;
    Addressable: string;
}

export interface Installation {
    InstallationTarget: InstallationTargetElement[];
}

export interface InstallationTargetElement {
    $: InstallationTarget;
}

export interface InstallationTarget {
    Id: string;
}

export interface Metadatum {
    Identity:     IdentityElement[];
    DisplayName:  string[];
    Description:  DescriptionElement[];
    Tags:         string[];
    Categories:   string[];
    GalleryFlags: string[];
    Badges:       string[];
    Properties:   MetadatumProperty[];
    Icon:         string[];
}

export interface DescriptionElement {
    _: string;
    $: Description;
}

export interface Description {
    "xml:space": string;
}

export interface IdentityElement {
    $: Identity;
}

export interface Identity {
    Language:  string;
    Id:        string;
    Version:   string;
    Publisher: string;
}

export interface MetadatumProperty {
    Property: PropertyProperty[];
}

export interface PropertyProperty {
    $: Property;
}

export interface Property {
    Id:    string;
    Value: string;
}
