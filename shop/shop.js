function revealPerks(){const id=location.hash.slice(1);if(!id.startsWith('perks-'))return;const group=document.getElementById(id);if(group instanceof HTMLDetailsElement)group.open=true;}
window.addEventListener('hashchange',revealPerks);
document.querySelectorAll('.rank-details-link').forEach(link=>link.addEventListener('click',()=>{const group=document.getElementById(link.hash.slice(1));if(group)group.open=true}));
revealPerks();
