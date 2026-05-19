export type PageDto = {
  id?: string;
  name: string;
  route: string;
  icon?: string;
  component?: string;
  sortOrder: number;
  isActive: boolean;
};
