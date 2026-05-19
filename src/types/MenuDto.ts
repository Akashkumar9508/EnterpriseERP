export interface MenuDto {
    id?: string;
    parentId?: string | null;
    pageId?: string | null;
    name: string;
    icon?: string;
    sortOrder: number;
    isVisible: boolean;
    isActive: boolean;
}
