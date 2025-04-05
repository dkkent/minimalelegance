  async searchJournalEntries(userId: number, query: string): Promise<JournalEntry[]> {
    // Get the user to check if they have a partner
    const user = await this.getUser(userId);
    const partnerId = user?.partnerId;
    
    // First get the base entries
    const entries = await db
      .select()
      .from(journalEntries)
      .where(and(
        partnerId 
          ? or(
              // Include entries where either the user or their partner is involved
              eq(journalEntries.user1Id, userId),
              eq(journalEntries.user2Id, userId),
              eq(journalEntries.user1Id, partnerId),
              eq(journalEntries.user2Id, partnerId)
            )
          : or(
              // If no partner, only include this user's entries
              eq(journalEntries.user1Id, userId),
              eq(journalEntries.user2Id, userId)
            ),
        sql`${journalEntries.searchableContent} ILIKE ${`%${query}%`}`
      ))
      .orderBy(desc(journalEntries.createdAt));
    
    // Enhance entries with loveslice data (same as in getJournalEntriesByUserId)
    for (const entry of entries) {
      if (entry.writtenLovesliceId) {
        const loveslice = await this.getLovesliceById(entry.writtenLovesliceId);
        if (loveslice) {
          const question = await this.getQuestion(loveslice.questionId);
          
          const response1 = await db
            .select()
            .from(responses)
            .where(eq(responses.id, loveslice.response1Id));
            
          const response2 = await db
            .select()
            .from(responses)
            .where(eq(responses.id, loveslice.response2Id));
          
          const user1 = await this.getUser(loveslice.user1Id);
          const user2 = await this.getUser(loveslice.user2Id);
          
          // Prepare user data with proper profile picture paths
          const user1Data = user1 ? {
            ...user1,
            profilePicture: user1.profilePicture ? 
              (user1.profilePicture.startsWith('/') ? user1.profilePicture : `/uploads/profile_pictures/${user1.profilePicture}`) : 
              null
          } : null;
          
          const user2Data = user2 ? {
            ...user2,
            profilePicture: user2.profilePicture ? 
              (user2.profilePicture.startsWith('/') ? user2.profilePicture : `/uploads/profile_pictures/${user2.profilePicture}`) : 
              null
          } : null;
            
          (entry as any).writtenLoveslice = {
            ...loveslice,
            question,
            responses: [
              { ...response1[0], user: user1Data },
              { ...response2[0], user: user2Data }
            ]
          };
        }
      }
      
      if (entry.spokenLovesliceId) {
        const spokenLoveslice = await this.getSpokenLovesliceById(entry.spokenLovesliceId);
        if (spokenLoveslice) {
          const conversation = await this.getConversationById(spokenLoveslice.conversationId);
          
          (entry as any).spokenLoveslice = {
            ...spokenLoveslice,
            conversation
          };
        }
      }
    }
    
    return entries;
  }
  
  async getJournalEntriesByTheme(userId: number, theme: string): Promise<JournalEntry[]> {
    // Get the user to check if they have a partner
    const user = await this.getUser(userId);
    const partnerId = user?.partnerId;
    
    // First get the base entries
    const entries = await db
      .select()
      .from(journalEntries)
      .where(and(
        partnerId 
          ? or(
              // Include entries where either the user or their partner is involved
              eq(journalEntries.user1Id, userId),
              eq(journalEntries.user2Id, userId),
              eq(journalEntries.user1Id, partnerId),
              eq(journalEntries.user2Id, partnerId)
            )
          : or(
              // If no partner, only include this user's entries
              eq(journalEntries.user1Id, userId),
              eq(journalEntries.user2Id, userId)
            ),
        eq(journalEntries.theme, theme)
      ))
      .orderBy(desc(journalEntries.createdAt));
    
    // Enhance entries with loveslice data (same as in getJournalEntriesByUserId)
    for (const entry of entries) {
      if (entry.writtenLovesliceId) {
        const loveslice = await this.getLovesliceById(entry.writtenLovesliceId);
        if (loveslice) {
          const question = await this.getQuestion(loveslice.questionId);
          
          const response1 = await db
            .select()
            .from(responses)
            .where(eq(responses.id, loveslice.response1Id));
            
          const response2 = await db
            .select()
            .from(responses)
            .where(eq(responses.id, loveslice.response2Id));
          
          const user1 = await this.getUser(loveslice.user1Id);
          const user2 = await this.getUser(loveslice.user2Id);
          
          // Prepare user data with proper profile picture paths
          const user1Data = user1 ? {
            ...user1,
            profilePicture: user1.profilePicture ? 
              (user1.profilePicture.startsWith('/') ? user1.profilePicture : `/uploads/profile_pictures/${user1.profilePicture}`) : 
              null
          } : null;
          
          const user2Data = user2 ? {
            ...user2,
            profilePicture: user2.profilePicture ? 
              (user2.profilePicture.startsWith('/') ? user2.profilePicture : `/uploads/profile_pictures/${user2.profilePicture}`) : 
              null
          } : null;
            
          (entry as any).writtenLoveslice = {
            ...loveslice,
            question,
            responses: [
              { ...response1[0], user: user1Data },
              { ...response2[0], user: user2Data }
            ]
          };
        }
      }
      
      if (entry.spokenLovesliceId) {
        const spokenLoveslice = await this.getSpokenLovesliceById(entry.spokenLovesliceId);
        if (spokenLoveslice) {
          const conversation = await this.getConversationById(spokenLoveslice.conversationId);
          
          (entry as any).spokenLoveslice = {
            ...spokenLoveslice,
            conversation
          };
        }
      }
    }
    
    return entries;
  }