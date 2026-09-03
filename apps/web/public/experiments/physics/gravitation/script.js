/* Apply theme before paint to avoid flash */
  (function(){
    try{
      var saved=localStorage.getItem('theme');
      var dark=saved==='dark'||(!saved&&window.matchMedia('(prefers-color-scheme: dark)').matches);
      if(dark)document.documentElement.classList.add('dark');
    }catch(e){}
  })();
