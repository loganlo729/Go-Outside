export type EventRecord = {
  eventID: string; userID: string; 
  categoryID: string | null;
  eventTitle: string | null; 
  eventDescription: string | null;
  eventStartTime: string | null; 
  eventEndTime: string | null;
  eventLocation: string | null; 
  eventCost: number | null;
  eventImageURL: string | null; 
  isFeatured: boolean; 
  status: string;
  hostName?: string | null;
};

export type CategoryRecord = { categoryID: string; categoryName: string };
export type DateFilter = 'all' | 'twoWeeks' | 'month';